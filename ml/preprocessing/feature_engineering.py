"""
ForgeSight AI — Feature Engineering Pipeline
Generates rolling statistics, lag features, and health index for C-MAPSS
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from typing import List, Optional


WINDOW_SIZES = [5, 10, 20]     # Cycle windows for rolling statistics
LAG_SIZES    = [1, 3, 5]      # Lag steps


def add_rolling_features(
    df: pd.DataFrame,
    sensor_cols: List[str],
    window_sizes: List[int] = WINDOW_SIZES,
) -> pd.DataFrame:
    """
    Add rolling mean, std, min, max for each sensor and window size.
    Groups by unit_id to avoid data leakage across units.
    """
    df = df.copy()
    for col in sensor_cols:
        for w in window_sizes:
            grouped = df.groupby("unit_id")[col]
            df[f"{col}_rmean_{w}"]  = grouped.transform(lambda x: x.rolling(w, min_periods=1).mean())
            df[f"{col}_rstd_{w}"]   = grouped.transform(lambda x: x.rolling(w, min_periods=1).std().fillna(0))
            df[f"{col}_rmin_{w}"]   = grouped.transform(lambda x: x.rolling(w, min_periods=1).min())
            df[f"{col}_rmax_{w}"]   = grouped.transform(lambda x: x.rolling(w, min_periods=1).max())
    return df


def add_lag_features(
    df: pd.DataFrame,
    sensor_cols: List[str],
    lag_sizes: List[int] = LAG_SIZES,
) -> pd.DataFrame:
    """Add lag features for temporal dependencies."""
    df = df.copy()
    for col in sensor_cols:
        for lag in lag_sizes:
            df[f"{col}_lag{lag}"] = df.groupby("unit_id")[col].shift(lag).bfill()
    return df


def add_ema_features(
    df: pd.DataFrame,
    sensor_cols: List[str],
    spans: List[int] = [5, 20],
) -> pd.DataFrame:
    """Add Exponential Moving Average for each sensor."""
    df = df.copy()
    for col in sensor_cols:
        for span in spans:
            df[f"{col}_ema{span}"] = df.groupby("unit_id")[col].transform(
                lambda x: x.ewm(span=span, adjust=False).mean()
            )
    return df


def add_rate_of_change(
    df: pd.DataFrame,
    sensor_cols: List[str],
) -> pd.DataFrame:
    """First-order difference (rate of change) per sensor."""
    df = df.copy()
    for col in sensor_cols:
        df[f"{col}_roc"] = df.groupby("unit_id")[col].diff().fillna(0)
    return df


def add_health_index(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute a surrogate Health Index from normalised RUL.
    HI ∈ [0, 1] where 1 = new, 0 = failed.
    """
    df = df.copy()
    if "rul" in df.columns:
        max_rul = df.groupby("unit_id")["rul"].transform("max")
        df["health_index"] = df["rul"] / max_rul.replace(0, np.nan)
        df["health_index"] = df["health_index"].fillna(0).clip(0, 1)
    return df


def add_cycle_ratio(df: pd.DataFrame) -> pd.DataFrame:
    """Normalised cycle position within a unit's life."""
    df = df.copy()
    max_cycle = df.groupby("unit_id")["cycle"].transform("max")
    df["cycle_ratio"] = df["cycle"] / max_cycle.replace(0, 1)
    return df


def build_feature_matrix(
    df: pd.DataFrame,
    sensor_cols: List[str],
    windows: List[int] = WINDOW_SIZES,
    lags: List[int] = LAG_SIZES,
    include_ema: bool = True,
    include_roc: bool = True,
) -> pd.DataFrame:
    """
    Full feature engineering pipeline.
    Returns DataFrame with all engineered features and target 'rul'.
    """
    df = add_rolling_features(df, sensor_cols, windows)
    df = add_lag_features(df, sensor_cols, lags)
    if include_ema:
        df = add_ema_features(df, sensor_cols)
    if include_roc:
        df = add_rate_of_change(df, sensor_cols)
    df = add_health_index(df)
    df = add_cycle_ratio(df)

    # Drop rows with NaNs from early cycles
    df = df.dropna().reset_index(drop=True)
    return df


def get_feature_names(sensor_cols: List[str]) -> List[str]:
    """Return all feature column names produced by build_feature_matrix."""
    names = list(sensor_cols)
    for col in sensor_cols:
        for w in WINDOW_SIZES:
            names += [f"{col}_rmean_{w}", f"{col}_rstd_{w}", f"{col}_rmin_{w}", f"{col}_rmax_{w}"]
        for lag in LAG_SIZES:
            names.append(f"{col}_lag{lag}")
        for span in [5, 20]:
            names.append(f"{col}_ema{span}")
        names.append(f"{col}_roc")
    names += ["health_index", "cycle_ratio", "cycle"]
    return names
