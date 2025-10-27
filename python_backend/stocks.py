# stocks_service.py
from datetime import datetime
import pandas as pd
import re
from typing import Optional, Dict, Any, List

# ---------- helper functions (moved out of app.py) ----------
def load_stocks_df(path: str) -> pd.DataFrame:
    """Try to read CSV; return empty DataFrame on failure."""
    try:
        df = pd.read_csv(path, dtype=str).fillna("")
        df.columns = [c.strip() for c in df.columns]
        return df
    except Exception as e:
        print(f"Failed to load CSV at {path}: {e}")
        return pd.DataFrame()

def parse_return(val) -> float:
    """Parse a return value and return a float. On failure return 0.0"""
    try:
        if val is None:
            return 0.0
        s = str(val).strip()
        if s == "":
            return 0.0
        s = s.replace('%', '').replace('+', '').replace(',', '').strip()
        return float(s)
    except Exception:
        return 0.0

def format_pct_value(val) -> str:
    """Return a string like +1.23% or -0.45% (preserve if already endswith '%')."""
    if isinstance(val, str) and val.strip().endswith("%"):
        return val.strip()
    try:
        f = float(val)
        return f"{f:+.2f}%"
    except Exception:
        return str(val or "")

def sort_key(stock: Dict[str, Any]):
    d = parse_return(stock.get("day_return", 0))
    w = parse_return(stock.get("weekly_return", 0))
    m = parse_return(stock.get("monthly_return", 0))
    neg_count = sum(1 for v in (d, w, m) if v < 0)
    total = d + w + m
    return (neg_count, -total)

def parse_5d_field(raw) -> List[float]:
    """Convert possible 5d field (string like '[-1.85, -0.84]' or list) to list of floats."""
    if raw is None or raw == "":
        return []
    if isinstance(raw, (list, tuple)):
        return [parse_return(x) for x in raw]
    s = str(raw).strip()
    matches = re.findall(r'-?\d+(?:\.\d+)?', s)
    if matches:
        return [float(m) for m in matches]
    try:
        return [float(s)]
    except Exception:
        return []

# ---------- main builder function ----------
def build_stocks_payload(
    stocks_df: pd.DataFrame,
    csv_path: str,
    tickers_q: Optional[str] = None,
    n: Optional[int] = None
) -> Dict[str, Any]:
    """
    Build the payload dict used by the /api/stocks route.
    - stocks_df: already-loaded DataFrame (strings), can be empty
    - csv_path: used only for error message
    - tickers_q: optional comma-separated string to filter Name/Symbol/NSE/BSE
    - n: optional integer to limit rows
    """
    if stocks_df is None or stocks_df.empty:
        return {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "count": 0,
            "stocks": [],
            "error": f"No CSV loaded at {csv_path}"
        }

    df = stocks_df.copy()

    # filter by tickers if provided
    if tickers_q:
        wanted = [t.strip().upper() for t in tickers_q.split(",") if t.strip()]
        def match_row(row):
            name = str(row.get("Name", "") or row.get("Symbol", "") or row.get("NSE Code", "")).upper()
            bse = str(row.get("BSE Code", "")).upper()
            nse = str(row.get("NSE Code", "")).upper()
            for t in wanted:
                if t == name or t == bse or t == nse:
                    return True
            return False
        df = df[df.apply(match_row, axis=1)]

    # limit rows if n given
    if n is not None and n > 0:
        df = df.head(n)

    # detect columns
    col_name = next((c for c in df.columns if c.lower() in ("name", "symbol")), None)
    col_return_1d = next((c for c in df.columns if c.lower() in (
        "return over 1day", "return over 1 day", "return_1day", "1d", "day_return")), None)
    col_return_1w = next((c for c in df.columns if c.lower() in (
        "return over 1week", "return over 1 week", "return_1week", "1w", "weekly_return")), None)
    col_return_1m = next((c for c in df.columns if c.lower() in (
        "return over 1month", "return over 1 month", "return_1month", "1m", "monthly_return")), None)
    col_5d = next((c for c in df.columns if c.lower() in (
        "5d_return", "5day_change", "5day", "5d", "five_day", "fiveDay")), None)

    # fallback: try to build grouped 5-day array from a 1d_change column if 5d missing
    grouped_5 = {}
    if not col_5d:
        col_1d_change = next((c for c in df.columns if c.lower() in (
            "1d_change", "daily_change", "1d_chnge", "day_change")), None)
        if col_name and col_1d_change:
            try:
                grouped_5 = df.groupby(col_name)[col_1d_change].apply(lambda x: list(x.tail(5))).to_dict()
                # convert values to floats
                for k, v in grouped_5.items():
                    grouped_5[k] = [parse_return(x) for x in v]
            except Exception:
                grouped_5 = {}

    stocks = []
    for _, row in df.iterrows():
        symbol = row.get(col_name, "") if col_name else row.get("Name", "") or row.get("Symbol", "") or ""
        item = {
            "name": symbol,
            "day_return": format_pct_value(row.get(col_return_1d, "")) if col_return_1d else "",
            "weekly_return": format_pct_value(row.get(col_return_1w, "")) if col_return_1w else "",
            "monthly_return": format_pct_value(row.get(col_return_1m, "")) if col_return_1m else "",
        }

        # prefer explicit 5d column; else grouped_5; else empty list
        if col_5d and row.get(col_5d, "") not in (None, ""):
            item["5d_return"] = parse_5d_field(row.get(col_5d))
        else:
            item["5d_return"] = grouped_5.get(symbol, [])

        stocks.append(item)

    # sort using existing logic
    try:
        stocks.sort(key=sort_key)
    except Exception:
        pass

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "count": len(stocks),
        "stocks": stocks
    }
