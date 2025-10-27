import yfinance as yf
import pandas as pd
import warnings
warnings.filterwarnings("ignore")
# desired single-level columns (yfinance standard)
desired_cols = ['symbol','Close', 'High', 'Low', 'Open', 'Volume']
df_all = pd.DataFrame(columns=desired_cols)
tickers = [
    "ADANIENT",
    "ADANIPORTS",
    "APOLLOHOSP","ASIANPAINT","AXISBANK","BAJAJ-AUTO","BAJFINANCE",
    "BAJAJFINSV","BEL","BHARTIARTL","CIPLA","COALINDIA","DRREDDY","EICHERMOT","ETERNAL",
    "GRASIM","HCLTECH","HDFCBANK","HDFCLIFE","HINDUNILVR","HINDALCO","ICICIBANK","INFY",
    "INDIGO","ITC","JIOFIN","JSWSTEEL","KOTAKBANK","LT","M&M","MARUTI","MAXHEALTH",
    "NESTLEIND","NTPC","ONGC","POWERGRID","RELIANCE","SBIN","SBILIFE","SHRIRAMFIN",
    "SUNPHARMA","TATACONSUM","TATAMOTORS","TATASTEEL","TCS","TECHM","TITAN","TRENT",
    "ULTRACEMCO","WIPRO"
]
start_date = "2024-10-21"
end_date = "2024-10-26"
nse_tickers = [s.strip().upper() + ".NS" if not (s.endswith(".NS") or s.endswith(".BO")) else s for s in tickers]
for symbol in nse_tickers:
    # data = yf.download(symbol, period="1mo")
    data = yf.download(symbol, start=start_date, end=end_date)
    data.columns = ['Close', 'High', 'Low', 'Open', 'Volume']
    data['symbol'] = symbol.replace('.NS','').replace('.BO','')
    df_all = pd.concat([df_all, data], axis=0, ignore_index=False)
df_all = df_all.sort_index().reset_index()
