import json
import logging
from pathlib import Path
from typing import Any, Dict, List
import pandas as pd

logger = logging.getLogger("terratrend.nasa_data")
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

VARIABLES_CONFIG: Dict[str, Dict[str, str]] = {
    "temperature": {
        "file": "temperature.csv",
        "name": "Surface Temperature",
        "unit": "°C",
        "raw_unit": "K",
    },
    "moisture": {
        "file": "moisture.csv",
        "name": "Root Zone Soil Moisture",
        "unit": "kg m-2",
        "raw_unit": "kg m-2",
    },
    "rain": {
        "file": "rain.csv",
        "name": "Precipitation",
        "unit": "mm/hr",
        "raw_unit": "mm/hr",
    },
    "evapo": {
        "file": "evapo.csv",
        "name": "Evapotranspiration",
        "unit": "kg m-2 s-1",
        "raw_unit": "kg m-2 s-1",
    },
}


class NasaDataError(Exception):
    pass


def resolve_variable_key(product: str, layer: str) -> str:
    combined = f"{product} {layer}".lower()
    if any(k in combined for k in ("moist", "soil", "gldas_noah")):
        return "moisture"
    if any(k in combined for k in ("rain", "precip", "gpm", "imerg")):
        return "rain"
    if any(k in combined for k in ("evap", "et")):
        return "evapo"
    return "temperature"


def fetch_point_timeseries(
    product: str,
    layer: str,
    lat: float,
    lon: float,
    start: str,
    end: str,
) -> List[Dict[str, Any]]:
    var_key = resolve_variable_key(product, layer)
    cfg = VARIABLES_CONFIG[var_key]
    csv_path = DATA_DIR / cfg["file"]

    if csv_path.exists():
        try:
            df = pd.read_csv(csv_path, skiprows=8)
            df = df.iloc[:, :2].copy()
            df.columns = ["Date", "Value"]
            records = df.to_dict(orient="records")
            if records:
                records[0]["_var_key"] = var_key
                records[0]["_source_file"] = cfg["file"]
                return records
        except Exception as exc:
            raise NasaDataError(f"Error reading {cfg['file']}: {exc}") from exc

    for json_candidate in [DATA_DIR / "dashboard_data.json", DATA_DIR.parent / "dashboard_data.json"]:
        if json_candidate.exists():
            with open(json_candidate, "r", encoding="utf-8") as f:
                dash_json = json.load(f)
            var_block = dash_json.get("variables", {}).get(var_key)
            if var_block and var_block.get("chart_data"):
                records = list(var_block["chart_data"])
                records[0]["_var_key"] = var_key
                records[0]["_source_file"] = f"dashboard_data.json ({var_key})"
                return records

    raise NasaDataError(f"File '{cfg['file']}' not found in data/ folder.")
