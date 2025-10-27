from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import random
import pandas as pd
from metrics import sample_metrics
import os
from stocks import load_stocks_df,build_stocks_payload
app = Flask(__name__)
CORS(app)

@app.route("/api/metrics")
def metrics():
    return jsonify({
        "metrics": sample_metrics(),
    })

CSV_PATH = os.environ.get("CSV_PATH", r"C:\Users\deepa\Downloads\data1.csv")
# load once
STOCKS_DF = load_stocks_df(CSV_PATH)
@app.route("/api/stocks")
def get_stocks():
    # read optional query params
    tickers_q = request.args.get("tickers", default=None, type=str)
    n = request.args.get("n", default=None, type=int)
    payload = build_stocks_payload(STOCKS_DF, CSV_PATH, tickers_q=tickers_q, n=n)
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


ET_URL = "https://economictimes.indiatimes.com/markets/fii-dii-activity"

# Simple cache
_cache = {"df": None, "fetched_at": None}
CACHE_TTL = timedelta(minutes=5)  # change as needed


def fetch_and_cache_df(force_refresh: bool = False) -> pd.DataFrame:
    """Fetch the combined table and cache it for CACHE_TTL unless force_refresh is True."""
    now = datetime.utcnow()
    if not force_refresh and _cache["df"] is not None and _cache["fetched_at"]:
        if now - _cache["fetched_at"] < CACHE_TTL:
            return _cache["df"]

    # fetch fresh
    tables = pd.read_html(ET_URL)
    df = pd.concat(
        [tables[3].reset_index(drop=True), tables[4].reset_index(drop=True)],
        axis=1,
    ).dropna(axis=1, how="all").reset_index(drop=True)

    _cache["df"] = df
    _cache["fetched_at"] = now
    return df


@app.route("/hist", methods=["GET"])
def hist_html():
    """Return HTML table (Bootstrap) of the combined FII/DII table."""
    try:
        df = fetch_and_cache_df()
    except Exception as e:
        return make_response(f"<h3>Fetch error: {e}</h3>", 502)

    html_table = df.to_html(index=False, classes="table table-bordered table-striped", border=0)
    html_page = f"""
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>FII / DII Historical Activity</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>body{{margin:20px;font-family:Arial, sans-serif}}h2{{text-align:center}}</style>
    </head>
    <body>
      <h2>FII / DII Historical Activity</h2>
      <div class="table-responsive">{html_table}</div>
      <p style="font-size:12px;color:gray">Updated: {_cache['fetched_at'].strftime('%Y-%m-%d %H:%M:%S') if _cache['fetched_at'] else 'N/A'} UTC</p>
    </body>
    </html>
    """
    return html_page


@app.route("/hist/json", methods=["GET"])
def hist_json():
    """Return JSON records of the combined table."""
    try:
        df = fetch_and_cache_df()
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    # optional: convert numeric columns to numbers where possible
    records = df.fillna("").to_dict(orient="records")
    return jsonify({"count": len(records), "data": records})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "cached_at": _cache["fetched_at"].isoformat() if _cache["fetched_at"] else None})



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000, debug=True)
