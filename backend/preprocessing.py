import logging
from typing import Any, Dict, List, Tuple
import pandas as pd

try:
    from backend.nasa_data import VARIABLES_CONFIG, resolve_variable_key
except ImportError:
    from nasa_data import VARIABLES_CONFIG, resolve_variable_key

logger = logging.getLogger("terratrend.preprocessing")


class PreprocessingError(Exception):
    pass


def clean_modis_lst(
    records: List[Dict[str, Any]],
    product: str,
    layer: str,
    start: str,
    end: str,
    aggregation: str = "monthly",
    deseasonalize: bool = False,
) -> Tuple[pd.DataFrame, List[str]]:
    if not records:
        raise PreprocessingError("Dataset is empty.")

    var_key = records[0].pop("_var_key", resolve_variable_key(product, layer))
    source_file = records[0].pop("_source_file", f"{var_key}.csv")
    cfg = VARIABLES_CONFIG.get(var_key, VARIABLES_CONFIG["temperature"])

    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["Date"], errors="coerce")
    df["raw_val"] = pd.to_numeric(df["Value"], errors="coerce")

    df = df.dropna(subset=["date", "raw_val"]).copy()
    df = df[(df["raw_val"] != -9999) & (df["raw_val"] > -900)].copy()

    start_dt = pd.to_datetime(start, errors="coerce")
    end_dt = pd.to_datetime(end, errors="coerce")
    if pd.notna(start_dt) and pd.notna(end_dt):
        df_sub = df[(df["date"] >= start_dt) & (df["date"] <= end_dt)].copy()
        if len(df_sub) >= 4:
            df = df_sub

    if df.empty:
        raise PreprocessingError(f"No valid observations found in {source_file}.")

    notes: List[str] = [
        f"Source: NASA Giovanni 10-Year Dataset ({source_file}) — {cfg['name']}.",
        "Region: India & South Asia (Bounding Box: 65°E, 5°N, 98°E, 37°N | Raipur Focus).",
    ]

    if var_key == "temperature" and df["raw_val"].median() > 200:
        df["value"] = df["raw_val"] - 273.15
        notes.append("Converted Kelvin (K) to Celsius (°C): Value - 273.15.")
    else:
        df["value"] = df["raw_val"]
        notes.append(f"Physical units: {cfg['unit']}.")

    df = df.sort_values("date").reset_index(drop=True)

    agg = (aggregation or "monthly").lower()
    if agg == "annual":
        df = df.set_index("date")["value"].resample("YS").mean().dropna().reset_index()
        notes.append("Aggregated monthly series to annual means.")
    else:
        df = df.set_index("date")["value"].resample("MS").mean().dropna().reset_index()

    if deseasonalize and agg != "annual" and len(df) >= 12:
        overall_mean = df["value"].mean()
        monthly_clim = df.groupby(df["date"].dt.month)["value"].transform("mean")
        df["value"] = df["value"] - monthly_clim + overall_mean
        notes.append("Deseasonalized series by removing monthly climatology.")

    return df.sort_values("date").reset_index(drop=True), notes
