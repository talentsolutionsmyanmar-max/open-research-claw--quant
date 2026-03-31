"""
Lightweight market regime tags for PRISM-style analysis (vol + simple trend vs mean).
Uses the same OHLC dataframe as the backtester.
"""

from __future__ import annotations

from typing import Any, Dict

import pandas as pd


def detect_regime(df: pd.DataFrame, lookback: int = 80) -> Dict[str, Any]:
    if df is None or len(df) < max(lookback, 25):
        return {
            "vol_regime": "unknown",
            "trend_regime": "unknown",
            "tag": "insufficient_data",
        }

    closes = df["close"].astype(float).iloc[-lookback:]
    rets = closes.pct_change().dropna()
    if len(rets) < 10:
        return {"vol_regime": "unknown", "trend_regime": "unknown", "tag": "insufficient_data"}

    rolling_vol = rets.rolling(20, min_periods=5).std()
    recent_vol = float(rolling_vol.iloc[-1])
    baseline = float(rolling_vol.median()) if rolling_vol.notna().any() else recent_vol
    if baseline <= 0 or pd.isna(baseline):
        vol_regime = "normal"
    elif recent_vol > baseline * 1.35:
        vol_regime = "high_vol"
    elif recent_vol < baseline * 0.65:
        vol_regime = "low_vol"
    else:
        vol_regime = "normal"

    sma = float(closes.mean())
    last = float(closes.iloc[-1])
    if last > sma * 1.015:
        trend = "up"
    elif last < sma * 0.985:
        trend = "down"
    else:
        trend = "range"

    tag = f"{vol_regime}_{trend}"
    return {
        "vol_regime": vol_regime,
        "trend_regime": trend,
        "tag": tag,
        "recent_vol": round(recent_vol, 6),
        "baseline_vol": round(float(baseline), 6) if not pd.isna(baseline) else None,
    }
