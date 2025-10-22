from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import random

app = Flask(__name__)
CORS(app)

def sample_metrics():
    now = datetime.utcnow().isoformat()
    return [
        {"title": "Nifty50", "value": "34,150", "d_change": "-0.67%", "prev_value": "34,378", "unit": "points", "last_updated": now},
        {"title": "Sensex", "value": "15,256", "d_change": "+0.12%", "prev_value": "15,237", "unit": "points", "last_updated": now},
        {"title": "Market Cap", "value": "31,250", "d_change": "+0.5%", "prev_value": "31,095", "unit": "T INR", "last_updated": now},
        {"title": "Visitors", "value": "15,803", "d_change": "+2.3%", "prev_value": "15,453", "unit": "visitors", "last_updated": now},
        {"title": "Active Users", "value": "8,432", "d_change": "-1.1%", "prev_value": "8,525", "unit": "users", "last_updated": now},
        {"title": "New Signups", "value": "1,245", "d_change": "+4.8%", "prev_value": "1,188", "unit": "signups", "last_updated": now}
    ]

@app.route("/api/metrics")
def metrics():
    return jsonify({
        "metrics": sample_metrics(),
        # timeseries can be used elsewhere
        "timeseries": [
            {"name": "Week 1", "uv": 200},
            {"name": "Week 2", "uv": 300},
            {"name": "Week 3", "uv": 500},
            {"name": "Week 4", "uv": 700},
            {"name": "Week 5", "uv": 650},
            {"name": "Week 6", "uv": 720}
        ],
        "pie": [
            {"name": "Completed", "value": 71},
            {"name": "Remaining", "value": 29}
        ]
    })

@app.route("/api/weekly")
def weekly():
    # Bar: daily values for a week
    bar = [
      {"name": "Mon", "value": 12},
      {"name": "Tue", "value": 18},
      {"name": "Wed", "value": 9},
      {"name": "Thu", "value": 14},
      {"name": "Fri", "value": 21},
      {"name": "Sat", "value": 7},
      {"name": "Sun", "value": 5}
    ]

    # Line: 12 weeks of trend data
    line = [{"name": f"Week {i+1}", "uv": random.randint(100, 900)} for i in range(12)]

    # Pie: multiple categories for order completion / status
    pie = [
      {"name": "Completed", "value": 58},
      {"name": "Pending", "value": 22},
      {"name": "Cancelled", "value": 12},
      {"name": "Refunded", "value": 8}
    ]

    # Sales analytics: monthly categories (used if frontend expects sales data)
    sales = [{"name": datetime.utcnow().strftime('%b %Y'), "sales": random.randint(1000,5000)} for _ in range(6)]
    for i in range(6):
        sales[i]["name"] = (datetime.utcnow() - timedelta(weeks=4*(5-i))).strftime('%b %Y')

    # Sample invoices (if frontend wants them)
    invoices = [
        {"id": "INV-1001", "amount": 230, "status": "paid", "date": "2025-10-01"},
        {"id": "INV-1002", "amount": 540, "status": "pending", "date": "2025-10-03"},
        {"id": "INV-1003", "amount": 410, "status": "paid", "date": "2025-10-04"},
        {"id": "INV-1004", "amount": 290, "status": "overdue", "date": "2025-10-06"}
    ]

    return jsonify({
        "bar": bar,
        "line": line,
        "pie": pie,
        "sales": sales,
        "invoices": invoices
    })

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
