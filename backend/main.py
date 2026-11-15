import logging
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from backend.nasa_data import VARIABLES_CONFIG, NasaDataError, fetch_point_timeseries, resolve_variable_key
    from backend.preprocessing import PreprocessingError, clean_modis_lst
    from backend.trend_analysis import TrendAnalysisError, analyze_timeseries
except ImportError:
    from nasa_data import VARIABLES_CONFIG, NasaDataError, fetch_point_timeseries, resolve_variable_key
    from preprocessing import PreprocessingError, clean_modis_lst
    from trend_analysis import TrendAnalysisError, analyze_timeseries

logger = logging.getLogger("terratrend.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

app = FastAPI(title="TerraTrend AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https://.*\.app\.github\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REAL_NASA_DATASETS: List[Dict[str, str]] = [
    {
        "id": "temperature",
        "title": "Surface Temperature (temperature.csv — NASA Giovanni 2015–2025)",
        "mission": "Terra MODIS / AIRS",
        "resolution": "Monthly, 2015-01 to 2025-09",
        "coverage": "India & South Asia (65°E–98°E, 5°N–37°N)",
        "description": "10-year NASA satellite surface temperature time series cleaned and converted from Kelvin to Celsius.",
        "url": "https://giovanni.gsfc.nasa.gov/",
    },
    {
        "id": "moisture",
        "title": "Root Zone Soil Moisture (moisture.csv — NASA GLDAS 2015–2025)",
        "mission": "GLDAS Noah",
        "resolution": "Monthly, 2015-01 to 2025-09",
        "coverage": "India & South Asia (65°E–98°E, 5°N–37°N)",
        "description": "Root zone soil moisture (kg m-2) measuring water availability in the upper soil profile.",
        "url": "https://giovanni.gsfc.nasa.gov/",
    },
    {
        "id": "rain",
        "title": "Precipitation Rate (rain.csv — NASA GPM IMERG 2015–2025)",
        "mission": "GPM",
        "resolution": "Monthly, 2015-01 to 2025-09",
        "coverage": "India & South Asia (65°E–98°E, 5°N–37°N)",
        "description": "Satellite-gauge merged precipitation rate (mm/hr) capturing monsoon intensity and rainfall shifts.",
        "url": "https://giovanni.gsfc.nasa.gov/",
    },
    {
        "id": "evapo",
        "title": "Evapotranspiration (evapo.csv — NASA GLDAS/MODIS 2015–2025)",
        "mission": "GLDAS / MODIS",
        "resolution": "Monthly, 2015-01 to 2025-09",
        "coverage": "India & South Asia (65°E–98°E, 5°N–37°N)",
        "description": "Total surface water vapor flux (kg m-2 s-1) combining soil evaporation and plant transpiration.",
        "url": "https://giovanni.gsfc.nasa.gov/",
    },
]

RECENT_ANALYSES: List[Dict[str, Any]] = []


def _preload_all_four_variables() -> None:
    if RECENT_ANALYSES:
        return
    for var_key, cfg in VARIABLES_CONFIG.items():
        try:
            raw = fetch_point_timeseries(var_key, var_key, 21.2514, 81.6296, "2015-01-01", "2025-09-30")
            df_clean, notes = clean_modis_lst(raw, var_key, var_key, "2015-01-01", "2025-09-30", "monthly", False)
            res = analyze_timeseries(df_clean, layer=cfg["name"], units=cfg["unit"], aggregation="monthly", notes=notes)
            mk_info = res["tests"]["mann_kendall"]
            sen_dec = res["tests"]["sen_slope"]["per_decade"]
            RECENT_ANALYSES.append(
                {
                    "id": var_key,
                    "region_key": "India & South Asia",
                    "title": f"{cfg['name']} ({cfg['file']})",
                    "summary": (
                        f"Direction: {mk_info['trend'].capitalize()} | "
                        f"Sen's Slope: {sen_dec:+.4g} {cfg['unit']}/decade | "
                        f"p-value: {mk_info['p_value']:.5f}"
                    ),
                    "is_significant": mk_info["p_value"] < 0.05,
                }
            )
        except Exception as exc:
            logger.warning("Preload skipped for %s: %s", var_key, exc)


class TrendAnalyzeRequest(BaseModel):
    product: str = Field(default="MOD11A2.061")
    layer: str = Field(default="LST_Day_1km")
    lat: float = Field(default=21.2514)
    lon: float = Field(default=81.6296)
    start: str = Field(default="2015-01-01")
    end: str = Field(default="2025-09-30")
    aggregation: str = Field(default="monthly")
    deseasonalize: bool = Field(default=False)


class AssistantChatRequest(BaseModel):
    message: str
    analysis: Optional[Dict[str, Any]] = None


@app.get("/api/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dashboard/summary")
def get_dashboard_summary() -> Dict[str, Any]:
    _preload_all_four_variables()
    sig_count = sum(1 for item in RECENT_ANALYSES if item.get("is_significant"))
    return {
        "datasets_available": len(REAL_NASA_DATASETS),
        "regions_analyzed": 1 if RECENT_ANALYSES else 0,
        "trends_found": len(RECENT_ANALYSES),
        "significant_trends": sig_count,
        "recent_trends": list(reversed(RECENT_ANALYSES[-6:])),
    }


@app.get("/api/datasets")
def list_datasets(q: Optional[str] = Query(default=None), mission: Optional[str] = Query(default=None)) -> List[Dict[str, str]]:
    results = REAL_NASA_DATASETS
    if mission and mission.strip():
        results = [d for d in results if mission.strip().lower() in d["mission"].lower()]
    if q and q.strip():
        ql = q.strip().lower()
        results = [d for d in results if ql in d["id"].lower() or ql in d["title"].lower() or ql in d["description"].lower()]
    return results


@app.post("/api/trends/analyze")
def run_trend_analysis(req: TrendAnalyzeRequest) -> Dict[str, Any]:
    var_key = resolve_variable_key(req.product, req.layer)
    cfg = VARIABLES_CONFIG[var_key]
    try:
        raw_records = fetch_point_timeseries(req.product, req.layer, req.lat, req.lon, req.start, req.end)
        df_clean, notes = clean_modis_lst(raw_records, req.product, req.layer, req.start, req.end, req.aggregation, req.deseasonalize)
        return analyze_timeseries(df_clean, layer=cfg["name"], units=cfg["unit"], aggregation=req.aggregation, notes=notes)
    except NasaDataError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except (PreprocessingError, TrendAnalysisError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/assistant/chat")
def assistant_chat(req: AssistantChatRequest) -> Dict[str, Any]:
    if req.analysis:
        meta = req.analysis.get("meta", {})
        mk_test = req.analysis.get("tests", {}).get("mann_kendall", {})
        sen = req.analysis.get("tests", {}).get("sen_slope", {})
        sig = req.analysis.get("significance", {})
        evidence = [
            f"Variable: {meta.get('layer')} (n = {meta.get('n_obs')} observations, 2015–2025).",
            f"Mann-Kendall Trend: {mk_test.get('trend', 'no trend').capitalize()} (p = {mk_test.get('p_value'):.5f}, tau = {mk_test.get('tau'):.3f}).",
            f"Sen's Slope: {sen.get('per_decade'):+.4g} {meta.get('units')}/decade ({sig.get('level')}).",
        ]
        answer = (
            f"Based on your 2015–2025 NASA Giovanni dataset for {meta.get('layer')}, the Mann-Kendall test detects a "
            f"'{mk_test.get('trend')}' trend (p = {mk_test.get('p_value'):.5f}, {sig.get('level')}) with a Sen's slope of "
            f"{sen.get('per_decade'):+.4g} {meta.get('units')} per decade."
        )
    else:
        evidence = ["No analysis attached yet. Run an analysis in Trend Analyzer first."]
        answer = (
            "Land Surface Temperature (LST) measures the radiative skin temperature of the ground, whereas weather stations measure "
            "air temperature 2 meters above the surface. Run a variable in Trend Analyzer so I can explain your exact numbers!"
        )

    explanations = [
        "Urban Heat Island expansion and changes in impervious surface cover alter daytime surface heating.",
        "Variations in soil moisture, monsoon rainfall, and vegetation cover (NDVI) control evaporative cooling.",
        "Caveat: Statistical correlation or trend detection does not prove causation, and linear extrapolation is not a climate projection.",
    ]
    return {"answer": answer, "evidence": evidence, "possible_explanations": explanations}
