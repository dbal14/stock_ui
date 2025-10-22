from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import random
import pandas as pd
app = Flask(__name__)
CORS(app)


def sample_metrics():
    now = datetime.utcnow().isoformat()
    return [
        {"title": "Nifty50", "value": "34,150", "d_change": "-0.67%"},
        {"title": "Sensex", "value": "15,256", "d_change": "+0.12%"},
        {"title": "Midcap", "value": "31,250", "d_change": "+0.5%"},
        {"title": "SmallCap", "value": "15,803", "d_change": "+2.3%"},
        {"title": "Microcap", "value": "8,432", "d_change": "-1.1%"},
    ]

@app.route("/api/metrics")
def metrics():
    return jsonify({
        "metrics": sample_metrics(),
    })

DEFAULT_TICKERS = [
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "LT", "MARUTI"
]

def format_pct(value):
    """Return a string like +1.23% or -0.45%"""
    return f"{value:+.2f}%"

CSV_PATH = r"C:\Users\deepa\Downloads\nifty-500.csv"

def load_stocks_df(path):
    # Try to read CSV; if it fails, return empty DataFrame
    try:
        df = pd.read_csv(path, dtype=str).fillna("")  # read everything as string to avoid dtype issues
        # normalize column names by stripping whitespace
        df.columns = [c.strip() for c in df.columns]
        return df
    except Exception as e:
        print(f"Failed to load CSV at {path}: {e}")
        return pd.DataFrame()

# Load once at startup (restart app to reload file). If you want fresh reads, call load_stocks_df inside the route.
STOCKS_DF = load_stocks_df(CSV_PATH)

def format_pct_value(val):
    # If already formatted (endswith '%') return as-is
    if isinstance(val, str) and val.strip().endswith("%"):
        return val.strip()
    try:
        f = float(val)
        return f"{f:+.2f}%"
    except Exception:
        return str(val or "")

@app.route("/api/stocks")
def get_stocks():
    """
    Returns JSON of stocks read from CSV.
    Optional query params:
      - tickers: comma-separated list to filter by name, bse or nse code (case-insensitive)
      - n: integer limit (# rows)
    """
    global STOCKS_DF

    if STOCKS_DF.empty:
        return jsonify({
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "count": 0,
            "stocks": [],
            "error": f"No CSV loaded at {CSV_PATH}"
        }), 200

    # Work on a copy
    df = STOCKS_DF.copy()

    # Optional filtering by tickers (matches Name, BSE Code, NSE Code if present)
    tickers_q = request.args.get("tickers", default=None, type=str)
    if tickers_q:
        wanted = [t.strip().upper() for t in tickers_q.split(",") if t.strip()]
        def match_row(row):
            # check several possible columns that might contain the ticker/name
            name = str(row.get("Name", "") or row.get("Symbol", "") or row.get("NSE Code", "")).upper()
            bse = str(row.get("BSE Code", "")).upper()
            nse = str(row.get("NSE Code", "")).upper()
            for t in wanted:
                if t == name or t == bse or t == nse:
                    return True
            return False
        df = df[df.apply(match_row, axis=1)]

    # Optional limit n
    n = request.args.get("n", default=None, type=int)
    if n is not None and n > 0:
        df = df.head(n)

    # Build standardized output
    stocks = []
    # Try to find column names used in your CSV (fall back to common alternatives)
    col_name = next((c for c in df.columns if c.lower() in ("name", "symbol")), None)
    col_return_1d = next((c for c in df.columns if c.lower() in ("return over 1day", "return over 1 day", "return_1day", "1d")), None)
    col_return_1w = next((c for c in df.columns if c.lower() in ("return over 1week", "return over 1 week", "return_1week", "1w")), None)
    col_return_1m = next((c for c in df.columns if c.lower() in ("return over 1month", "return over 1 month", "return_1month", "1m")), None)

    for _, row in df.iterrows():
        item = {}
        item["name"] = (row.get(col_name, "") if col_name else row.get("Name", "") or row.get("Symbol", "") or "")
        item["day_return"] = format_pct_value(row.get(col_return_1d, "")) if col_return_1d else ""
        item["weekly_return"] = format_pct_value(row.get(col_return_1w, "")) if col_return_1w else ""
        item["monthly_return"] = format_pct_value(row.get(col_return_1m, "")) if col_return_1m else ""
        # include raw row if you want extra fields (uncomment next line)
        # item.update({k: (v if v != "" else None) for k, v in row.items()})
        stocks.append(item)

    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "count": len(stocks),
        "stocks": stocks,
    }
    return jsonify(payload)
@app.route("/api/random_timeseries")
def random_timeseries():
    today = datetime.utcnow().date()
    data = []
    for i in range(30):
        day = today - timedelta(days=29-i)
        data.append({
            "date": day.isoformat(),
            "value": random.randint(50, 200)
        })
    return jsonify({"series": data})



# ---------- New: Proxy endpoint to integrate with external API ----------
# Set environment variable NEW_API_URL to the external API base URL (e.g. https://api.example.com/data)
# The endpoint below will forward a GET request to that URL and return the JSON response.
# This allows the frontend to call our backend (same-origin) while the backend fetches external data.
import os
import requests
from flask import request, Response

@app.route('/api/external_proxy')
def external_proxy():
    new_api = os.environ.get('NEW_API_URL')
    if not new_api:
        return jsonify({'error': 'NEW_API_URL not configured on server'}), 500

    # Forward query string parameters
    params = request.args.to_dict()
    try:
        resp = requests.get(new_api, params=params, timeout=10)
        # If external returns non-JSON, pass through raw text
        content_type = resp.headers.get('Content-Type', '')
        if 'application/json' in content_type:
            return Response(resp.content, status=resp.status_code, content_type='application/json')
        else:
            return Response(resp.text, status=resp.status_code, content_type=content_type or 'text/plain')
    except requests.RequestException as e:
        return jsonify({'error': 'failed to fetch external API', 'details': str(e)}), 502

# ---------- End proxy endpoint ----------




@app.route("/api/auto_data")
def auto_data():
    import os
    import requests
    from flask import request

    new_api = os.environ.get("NEW_API_URL")
    api_key = os.environ.get("NEW_API_KEY")

    # Static dataset modeled after the screenshot (fallback)
    static_data = [
        {"Ticker": "MARUTI", "Price": "16,401.00", "OneMoReturn": "3.8%", "ThreeMoReturn": "31.5%"},
        {"Ticker": "M&M", "Price": "3,647.20", "OneMoReturn": "0.39%", "ThreeMoReturn": "14.2%"},
        {"Ticker": "TATAMOTORS", "Price": "396.60", "OneMoReturn": "-8.9%", "ThreeMoReturn": "-3.9%"},
        {"Ticker": "BAJAJ.AUTO", "Price": "9,150.50", "OneMoReturn": "0.73%", "ThreeMoReturn": "9.9%"},
        {"Ticker": "HYUNDAI", "Price": "2,346.80", "OneMoReturn": "-11.5%", "ThreeMoReturn": "9.9%"},
        {"Ticker": "EICHERMOT", "Price": "7,042.50", "OneMoReturn": "2.2%", "ThreeMoReturn": "24.7%"},
        {"Ticker": "TVSMOTOR", "Price": "3,654.00", "OneMoReturn": "4.4%", "ThreeMoReturn": "26.9%"},
        {"Ticker": "HEROMOTOCO", "Price": "5,592.50", "OneMoReturn": "4.5%", "ThreeMoReturn": "25.9%"},
        {"Ticker": "MOTHERSON", "Price": "104.70", "OneMoReturn": "-4.2%", "ThreeMoReturn": "2.1%"},
        {"Ticker": "ASHOKLEY", "Price": "134.51", "OneMoReturn": "-1.7%", "ThreeMoReturn": "8.7%"},
        {"Ticker": "BMW", "Price": "43.07", "OneMoReturn": "-9.8%", "ThreeMoReturn": "-18.9%"}
    ]
    # If NEW_API_URL provided, try to fetch and use it
    if new_api:
        try:
            params = request.args.to_dict()
            headers = {}
            if api_key:
                headers['Authorization'] = f"Bearer {api_key}"
            resp = requests.get(new_api, params=params, headers=headers, timeout=10)
            resp.raise_for_status()
            content_type = resp.headers.get('Content-Type', '')
            if 'application/json' in content_type:
                payload = resp.json()
                # If payload is a dict with 'data' or 'items', try to extract list
                if isinstance(payload, dict):
                    candidates = []
                    for k in ('data','items','results','rows','symbols'):
                        if k in payload and isinstance(payload[k], (list,tuple)):
                            candidates = payload[k]
                            break
                    if not candidates:
                        # If payload looks like list wrapped as dict, look for first list value
                        for v in payload.values():
                            if isinstance(v, (list,tuple)):
                                candidates = v
                                break
                    # If candidates still empty and payload itself is a dict with fields for single row,
                    # wrap it into list
                    if not candidates and not isinstance(payload, list):
                        candidates = [payload]
                elif isinstance(payload, list):
                    candidates = payload
                else:
                    candidates = []
                # If we have candidate list, return it under key 'data' for frontend compatibility
                if candidates:
                    # Append average row if not present
                    # (frontend expects res.data)
                    if not any(str(r.get('Ticker','')).lower() == 'average' for r in candidates):
                        candidates.append(average)
                    return jsonify({'data': candidates})
                else:
                    # fallback to static if structure unexpected
                    pass
            else:
                # non-json, fallback to static
                pass
        except Exception as e:
            # log but fall back to static
            print("external fetch failed:", e)

    # default fallback
    # static_data.append(average)
    return jsonify({"data": static_data})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000, debug=True)
