# metrics.py
from datetime import datetime

def sample_metrics():
    """Return a list of sample market metrics (timestamp generated inside caller)."""
    # Note: do not include timestamp here so caller (app.py) can stamp when it serves
    return [
        {"title": "Nifty50", "value": "34,150", "d_change": "-0.67%"},
        {"title": "Sensex", "value": "15,256", "d_change": "+0.12%"},
        {"title": "Midcap", "value": "31,250", "d_change": "+0.5%"},
        {"title": "SmallCap", "value": "15,803", "d_change": "+2.3%"},
        {"title": "Microcap", "value": "8,432", "d_change": "-1.1%"},
        {"title": "CrodOil", "value": "45,123", "d_change": "+0.9%"},
        {"title": "Dullar", "value": "22,456", "d_change": "-0.4%"},
        {"title": "vix", "value": "12,345", "d_change": "+1.2%"},
    ]
