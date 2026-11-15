import csv
import io
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

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
        "name": "Precipitation Rate",
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
        with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        header_idx = 0
        for i, line in enumerate(lines):
            s = line.strip().lower()
            if s.startswith("time,") or s.startswith("date,") or s.startswith("datetime,"):
                header_idx = i
                break

        reader = csv.reader(io.StringIO("".join(lines[header_idx:])))
        rows = list(reader)
        if len(rows) > 1:
            records = []
            for r in rows[1:]:
                if len(r) >= 2 and r[0].strip():
                    records.append({"Date": r[0].strip(), "Value": r[1].strip()})
            if records:
                records[0]["_var_key"] = var_key
                records[0]["_source_file"] = cfg["file"]
                return records

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
