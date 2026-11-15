import io
import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from scipy import stats

try:
    from backend.nasa_data import VARIABLES_CONFIG, NasaDataError, fetch_point_timeseries, resolve_variable_key
    from backend.preprocessing import PreprocessingError, clean_modis_lst
    from backend.trend_analysis import TrendAnalysisError, analyze_timeseries, _sigfig
except ImportError:
    from nasa_data import VARIABLES_CONFIG, NasaDataError, fetch_point_timeseries, resolve_variable_key
    from preprocessing import PreprocessingError, clean_modis_lst
    from trend_analysis import TrendAnalysisError, analyze_timeseries, _sigfig

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


def _load_clean_series(var_key: str, start: str = "2015-01-01", end: str = "2025-09-30", deseasonalize: bool = True) -> pd.DataFrame:
    raw = fetch_point_timeseries(var_key, var_key, 21.2514, 81.6296, start, end)
    df_clean, _ = clean_modis_lst(raw, var_key, var_key, start, end, "monthly", deseasonalize)
    return df_clean


def _preload_all_four_variables() -> None:
    if RECENT_ANALYSES:
        return
    for var_key, cfg in VARIABLES_CONFIG.items():
        try:
            raw = fetch_point_timeseries(var_key, var_key, 21.2514, 81.6296, "2015-01-01", "2025-09-30")
            df_clean, notes = clean_modis_lst(raw, var_key, var_key, "2015-01-01", "2025-09-30", "monthly", True)
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
    product: str = Field(default="temperature")
    layer: str = Field(default="LST_Day_1km")
    lat: float = Field(default=21.2514)
    lon: float = Field(default=81.6296)
    start: str = Field(default="2015-01-01")
    end: str = Field(default="2025-09-30")
    aggregation: str = Field(default="monthly")
    deseasonalize: bool = Field(default=True)


class AssistantChatRequest(BaseModel):
    message: str
    analysis: Optional[Dict[str, Any]] = None


class CorrelationRequest(BaseModel):
    var_x: str = Field(default="temperature")
    var_y: str = Field(default="moisture")
    max_lag_months: int = Field(default=6, ge=1, le=12)
    deseasonalize: bool = Field(default=False)


class ForecastRequest(BaseModel):
    variable: str = Field(default="temperature")
    horizon_years: int = Field(default=5, ge=1, le=20)
    deseasonalize: bool = Field(default=True)


class CompareRequest(BaseModel):
    variable: str = Field(default="temperature")
    variables: List[str] = Field(default=["temperature", "moisture", "rain", "evapo"])
    deseasonalize: bool = Field(default=True)


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
        "recent_trends": list(RECENT_ANALYSES),
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


@app.post("/api/correlation/analyze")
def analyze_correlation(req: CorrelationRequest) -> Dict[str, Any]:
    vx = resolve_variable_key(req.var_x, req.var_x)
    vy = resolve_variable_key(req.var_y, req.var_y)

    # Load all 4 variables to build the full 4x4 correlation matrix
    dfs = {}
    for k in VARIABLES_CONFIG:
        df_k = _load_clean_series(k, deseasonalize=req.deseasonalize)
        dfs[k] = df_k.set_index("date")["value"].rename(k)

    combined = pd.concat(dfs.values(), axis=1).dropna()
    if len(combined) < 6:
        raise HTTPException(status_code=422, detail="Insufficient overlapping monthly records for correlation.")

    s_x = combined[vx].to_numpy(dtype=float)
    s_y = combined[vy].to_numpy(dtype=float)

    pearson_r, pearson_p = stats.pearsonr(s_x, s_y)
    spearman_r, spearman_p = stats.spearmanr(s_x, s_y)

    # Lagged correlation: positive lag means var_x leads var_y by k months
    lags = []
    max_lag = int(req.max_lag_months)
    best_lag = 0
    best_r = float(pearson_r)
    for lag in range(-max_lag, max_lag + 1):
        if lag < 0:
            x_sub, y_sub = s_x[:lag], s_y[-lag:]
        elif lag > 0:
            x_sub, y_sub = s_x[lag:], s_y[:-lag]
        else:
            x_sub, y_sub = s_x, s_y
        if len(x_sub) >= 6:
            r_val, p_val = stats.pearsonr(x_sub, y_sub)
            lags.append({"lag": lag, "r": round(float(r_val), 4), "p_value": round(float(p_val), 5)})
            if abs(r_val) > abs(best_r):
                best_r = float(r_val)
                best_lag = lag

    # 4x4 Pearson Matrix
    corr_df = combined.corr(method="pearson")
    matrix = []
    keys = list(VARIABLES_CONFIG.keys())
    for k1 in keys:
        row = {"variable": VARIABLES_CONFIG[k1]["name"], "id": k1}
        for k2 in keys:
            row[k2] = round(float(corr_df.loc[k1, k2]), 3)
        matrix.append(row)

    # Z-score standardized series for dual overlay plotting
    z_x = (s_x - np.mean(s_x)) / (np.std(s_x) or 1.0)
    z_y = (s_y - np.mean(s_y)) / (np.std(s_y) or 1.0)
    dates_str = [d.strftime("%Y-%m-%d") for d in combined.index]

    return {
        "var_x": {"id": vx, **VARIABLES_CONFIG[vx]},
        "var_y": {"id": vy, **VARIABLES_CONFIG[vy]},
        "n_obs": len(combined),
        "pearson": {"r": round(float(pearson_r), 4), "p_value": round(float(pearson_p), 6)},
        "spearman": {"r": round(float(spearman_r), 4), "p_value": round(float(spearman_p), 6)},
        "best_lag": {"lag_months": best_lag, "r": round(best_r, 4)},
        "lags": lags,
        "matrix": matrix,
        "paired_series": [
            {
                "date": d,
                "x_raw": _sigfig(vx_val),
                "y_raw": _sigfig(vy_val),
                "x_z": round(float(zx), 3),
                "y_z": round(float(zy), 3),
            }
            for d, vx_val, vy_val, zx, zy in zip(dates_str, s_x, s_y, z_x, z_y)
        ],
    }


@app.post("/api/predictions/forecast")
def forecast_trend(req: ForecastRequest) -> Dict[str, Any]:
    var_key = resolve_variable_key(req.variable, req.variable)
    cfg = VARIABLES_CONFIG[var_key]
    df = _load_clean_series(var_key, deseasonalize=req.deseasonalize)

    dates = pd.to_datetime(df["date"])
    y = df["value"].to_numpy(dtype=float)
    n = len(y)

    t0 = dates.iloc[0]
    t_years = (dates - t0).dt.total_seconds().to_numpy() / (86400.0 * 365.25)

    ols = stats.linregress(t_years, y)
    slope = float(ols.slope)
    intercept = float(ols.intercept)
    y_hat = intercept + slope * t_years

    residuals = y - y_hat
    dof = max(n - 2, 1)
    s_err = float(np.sqrt(np.sum(residuals ** 2) / dof))
    t_crit = float(stats.t.ppf(0.975, dof))
    t_mean = float(np.mean(t_years))
    ss_t = float(np.sum((t_years - t_mean) ** 2)) or 1.0

    # Generate future monthly dates
    last_date = dates.iloc[-1]
    future_months = int(req.horizon_years) * 12
    future_dates = pd.date_range(
        start=last_date + pd.DateOffset(months=1),
        periods=future_months,
        freq="MS",
    )
    t_future = (future_dates - t0).total_seconds().to_numpy() / (86400.0 * 365.25)
    y_future = intercept + slope * t_future

    # 95% Prediction Interval (accounts for both slope uncertainty and residual variance)
    pi_half = t_crit * s_err * np.sqrt(1.0 + (1.0 / n) + ((t_future - t_mean) ** 2) / ss_t)
    y_upper = y_future + pi_half
    y_lower = y_future - pi_half

    return {
        "meta": {
            "variable": var_key,
            "name": cfg["name"],
            "units": cfg["unit"],
            "n_historical": n,
            "horizon_years": req.horizon_years,
            "slope_per_year": _sigfig(slope),
            "slope_per_decade": _sigfig(slope * 10.0),
            "r2": round(float(ols.rvalue ** 2), 4),
            "p_value": round(float(ols.pvalue), 6),
        },
        "historical": [
            {"date": d.strftime("%Y-%m-%d"), "value": _sigfig(v), "fit": _sigfig(f)}
            for d, v, f in zip(dates, y, y_hat)
        ],
        "forecast": [
            {
                "date": d.strftime("%Y-%m-%d"),
                "value": _sigfig(v),
                "ci_low": _sigfig(lo),
                "ci_high": _sigfig(hi),
            }
            for d, v, lo, hi in zip(future_dates, y_future, y_lower, y_upper)
        ],
        "summary": {
            "last_observed_date": last_date.strftime("%Y-%m-%d"),
            "last_observed_value": _sigfig(y[-1]),
            "projected_end_date": future_dates[-1].strftime("%Y-%m-%d"),
            "projected_value": _sigfig(y_future[-1]),
            "projected_ci_low": _sigfig(y_lower[-1]),
            "projected_ci_high": _sigfig(y_upper[-1]),
            "projected_change": _sigfig(y_future[-1] - y_hat[-1]),
        },
    }


@app.post("/api/regions/compare")
def compare_regimes_and_variables(req: CompareRequest) -> Dict[str, Any]:
    var_key = resolve_variable_key(req.variable, req.variable)
    cfg = VARIABLES_CONFIG[var_key]
    df_main = _load_clean_series(var_key, deseasonalize=req.deseasonalize)

    # 1. Early Decade (2015–2019) vs Recent Decade (2020–2025) Regime Comparison
    df_early = df_main[df_main["date"] < pd.to_datetime("2020-01-01")].copy()
    df_recent = df_main[df_main["date"] >= pd.to_datetime("2020-01-01")].copy()

    res_full = analyze_timeseries(df_main, layer=f"{cfg['name']} (Full 2015–2025)", units=cfg["unit"])
    res_early = analyze_timeseries(df_early, layer="Early Regime (2015–2019)", units=cfg["unit"])
    res_recent = analyze_timeseries(df_recent, layer="Recent Regime (2020–2025)", units=cfg["unit"])

    # 2. Multi-Variable Normalized Comparison (Z-score anomalies across all 4 NASA variables)
    multi_series = {}
    summary_rows = []
    for k, vcfg in VARIABLES_CONFIG.items():
        df_k = _load_clean_series(k, deseasonalize=req.deseasonalize)
        res_k = analyze_timeseries(df_k, layer=vcfg["name"], units=vcfg["unit"])
        vals = df_k["value"].to_numpy(dtype=float)
        z_vals = (vals - np.mean(vals)) / (np.std(vals) or 1.0)
        multi_series[k] = [
            {"date": d.strftime("%Y-%m-%d"), "z": round(float(z), 3), "raw": _sigfig(rv)}
            for d, z, rv in zip(df_k["date"], z_vals, vals)
        ]
        summary_rows.append(
            {
                "id": k,
                "name": vcfg["name"],
                "units": vcfg["unit"],
                "slope_per_decade": res_k["trend"]["slope_per_decade"],
                "sen_per_decade": res_k["tests"]["sen_slope"]["per_decade"],
                "p_value": res_k["tests"]["mann_kendall"]["p_value"],
                "tau": res_k["tests"]["mann_kendall"]["tau"],
                "trend": res_k["tests"]["mann_kendall"]["trend"],
                "significant": res_k["significance"]["significant"],
            }
        )

    return {
        "focus_variable": {"id": var_key, **cfg},
        "regimes": [
            {"period": "Early Period (2015–2019)", "result": res_early},
            {"period": "Recent Period (2020–2025)", "result": res_recent},
            {"period": "Full 10-Year Record (2015–2025)", "result": res_full},
        ],
        "variables_summary": summary_rows,
        "normalized_series": multi_series,
    }


@app.post("/api/reports/pdf")
def generate_report_file(payload: Optional[Dict[str, Any]] = None) -> StreamingResponse:
    _preload_all_four_variables()
    lines = [
        "======================================================================",
        "  TERRATREND AI — EARTH SYSTEM TREND INTELLIGENCE REPORT",
        "  NASA Space Apps Challenge 2026 | Study Region: Raipur & South Asia",
        "======================================================================",
        "",
        "1. EXECUTIVE SUMMARY OF 2015-2025 NASA GIOVANNI DATASETS:",
    ]
    for item in RECENT_ANALYSES:
        lines.append(f"   - {item['title']}: {item['summary']}")
    lines.extend([
        "",
        "2. STATISTICAL METHODOLOGY:",
        "   - Ordinary Least Squares (OLS) linear regression & Student's t-test",
        "   - Hamed & Rao autocorrelation-modified Mann-Kendall monotonic test",
        "   - Theil-Sen non-parametric robust slope estimator with 95% CIs",
        "",
        "3. SCIENTIFIC CAVEATS:",
        "   - Correlation does not establish physical causation.",
        "   - Linear statistical extrapolation is not a coupled climate projection.",
        "   - Satellite Land Surface Temperature (LST) differs from 2m air temperature.",
        "======================================================================",
    ])
    content = "\n".join(lines).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=TerraTrend_AI_Report.txt"},
    )


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
