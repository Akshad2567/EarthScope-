import logging
from typing import Any, Dict, List
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats

logger = logging.getLogger("terratrend.trend_analysis")


class TrendAnalysisError(Exception):
    pass


def _sigfig(val: float, digits: int = 6) -> float:
    if val == 0 or np.isnan(val):
        return 0.0
    return float(f"{float(val):.{digits}g}")


def analyze_timeseries(
    df: pd.DataFrame,
    layer: str,
    units: str = "°C",
    aggregation: str = "monthly",
    notes: List[str] | None = None,
    alpha: float = 0.05,
) -> Dict[str, Any]:
    if df is None or len(df) < 4:
        raise TrendAnalysisError("At least 4 valid observations are required for trend analysis.")

    df_sorted = df.sort_values("date").reset_index(drop=True)
    dates = pd.to_datetime(df_sorted["date"])
    y = df_sorted["value"].to_numpy(dtype=float)
    n_obs = int(len(y))

    t_days = (dates - dates.iloc[0]).dt.total_seconds().to_numpy() / 86400.0
    t_years = t_days / 365.25

    ols_res = stats.linregress(t_years, y)
    slope_per_year = float(ols_res.slope)
    slope_per_decade = float(slope_per_year * 10.0)
    intercept = float(ols_res.intercept)
    r2 = float(ols_res.rvalue ** 2)
    t_stat = float(ols_res.slope / ols_res.stderr) if (ols_res.stderr and ols_res.stderr > 0) else 0.0
    ttest_p = float(ols_res.pvalue)
    y_hat = intercept + slope_per_year * t_years

    try:
        mk_res = mk.hamed_rao_modification_test(y, alpha=alpha)
        used_modified_mk = True
    except Exception:
        mk_res = mk.original_test(y, alpha=alpha)
        used_modified_mk = False

    mk_tau = float(mk_res.Tau) if not np.isnan(mk_res.Tau) else 0.0
    mk_z = float(mk_res.z) if not np.isnan(mk_res.z) else 0.0
    mk_p = float(mk_res.p) if not np.isnan(mk_res.p) else 1.0
    mk_trend = str(mk_res.trend)

    sen_slope_yr, _, sen_ci_low_yr, sen_ci_high_yr = stats.theilslopes(y, t_years, alpha=alpha)
    sen_per_year = float(sen_slope_yr)
    sen_per_decade = float(sen_per_year * 10.0)

    if mk_p < 0.01:
        sig_level = f"highly significant (p < 0.01, {mk_trend})"
    elif mk_p < alpha:
        sig_level = f"significant (p < {alpha}, {mk_trend})"
    else:
        sig_level = f"not statistically significant (p = {mk_p:.3f})"

    return {
        "meta": {
            "layer": layer,
            "units": units,
            "n_obs": n_obs,
            "aggregation": aggregation,
            "notes": notes or [],
        },
        "series": [{"date": d.strftime("%Y-%m-%d"), "value": _sigfig(v)} for d, v in zip(dates, y)],
        "trend_line": [{"date": d.strftime("%Y-%m-%d"), "value": _sigfig(v)} for d, v in zip(dates, y_hat)],
        "trend": {
            "slope_per_year": _sigfig(slope_per_year),
            "slope_per_decade": _sigfig(slope_per_decade),
            "r2": round(r2, 4),
        },
        "tests": {
            "mann_kendall": {
                "tau": round(mk_tau, 4),
                "z": round(mk_z, 4),
                "p_value": round(mk_p, 6),
                "trend": mk_trend,
                "modified": used_modified_mk,
            },
            "sen_slope": {
                "per_year": _sigfig(sen_per_year),
                "per_decade": _sigfig(sen_per_decade),
                "ci_low": _sigfig(sen_ci_low_yr),
                "ci_high": _sigfig(sen_ci_high_yr),
            },
            "ttest": {
                "t": round(t_stat, 4),
                "p_value": round(ttest_p, 6),
            },
        },
        "significance": {
            "alpha": alpha,
            "level": sig_level,
        },
    }
