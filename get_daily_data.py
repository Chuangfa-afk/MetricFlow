import yfinance as yf
import json
import pandas as pd
import numpy as np
import os

# --- CONFIGURATION ---
TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX",
    "JPM", "BAC", "V", "MA",
    "JNJ", "PFE", "UNH", "LLY",
    "XOM", "CVX",
    "KO", "PEP", "MCD", "WMT", "COST",
    "BA", "CAT", "MMM"
]

PROFILE_FILE = "company_profiles.json"
OUTPUT_FILE = "stock_data.json"

def load_profiles():
    if os.path.exists(PROFILE_FILE):
        try:
            with open(PROFILE_FILE, "r") as f:
                return json.load(f)
        except:
            print("⚠️ Warning: company_profiles.json not found.")
            return {}
    return {}

def get_daily_update():
    profiles = load_profiles()
    stock_data = []
    
    print(f"🚀 Starting Daily Data Run for {len(TICKERS)} stocks...")
    
    for symbol in TICKERS:
        print(f"Processing {symbol}...")
        
        # 1. Load Static Data
        static = profiles.get(symbol, {
            "name": symbol, "description": "Run get_static_data.py", 
            "ceo": "N/A", "hq": "N/A", "employees": 0, 
            "website": "#", "sector": "N/A", "industry": "N/A"
        })

        try:
            stock = yf.Ticker(symbol)
            
            # --- 2. LIVE PRICE ---
            fast_info = stock.fast_info
            current_price = fast_info.last_price
            prev_close = fast_info.previous_close
            change = current_price - prev_close
            change_percent = (change / prev_close) * 100
            market_cap = fast_info.market_cap
            high_52 = fast_info.year_high
            low_52 = fast_info.year_low

            # --- 3. VITAL SIGNS ---
            try:
                info = stock.info
                profit_margin = info.get('profitMargins', 0)
                roe = info.get('returnOnEquity', 0)
                target_price = info.get('targetMeanPrice', 0)
                beta = info.get('beta', 1.0)
            except:
                profit_margin, roe, target_price, beta = 0, 0, 0, 1.0

            # --- 4. HISTORY & RISK ---
            hist = stock.history(period="5y")
            hist = hist.reset_index()
            hist['Date'] = hist['Date'].dt.strftime('%Y-%m-%d')
            
            full_history = []
            peak_price = 0
            for _, row in hist.iterrows():
                price = round(row['Close'], 2)
                if price > peak_price: peak_price = price
                drawdown = 0 if peak_price == 0 else round(((price - peak_price) / peak_price) * 100, 2)
                full_history.append({"date": row['Date'], "price": price, "drawdown": drawdown})

            returns = hist['Close'].pct_change().dropna()
            if len(returns) > 0:
                mean_return = returns.mean() * 252
                std_dev = returns.std() * np.sqrt(252)
                sharpe_ratio = round((mean_return - 0.04) / std_dev, 2)
                downside = returns[returns < 0]
                sortino_ratio = 0
                if not downside.empty:
                    downside_std = downside.std() * np.sqrt(252)
                    if downside_std > 0:
                        sortino_ratio = round((mean_return - 0.04) / downside_std, 2)
                max_drawdown = min([pt['drawdown'] for pt in full_history])
            else:
                sharpe_ratio, sortino_ratio, max_drawdown = 0, 0, 0

            # --- 5. FINANCIALS (SELF-BALANCING LOGIC) ---
            financials_data = None
            try:
                if not stock.financials.empty:
                    # Get the most recent column (usually TTM or last year)
                    recent = stock.financials.iloc[:, 0]
                    
                    # 1. Get the Anchors (The numbers we trust)
                    revenue = recent.get('Total Revenue', 0)
                    net_income = recent.get('Net Income', 0)
                    
                    # 2. Try to get Cost of Revenue (Banks often lack this)
                    cost_of_rev = recent.get('Cost Of Revenue', np.nan)
                    
                    # 3. Logic for Banks / Financials (If Cost is NaN)
                    if pd.isna(cost_of_rev):
                        cost_of_rev = 0
                        
                    # 4. Calculate Gross Profit manually to ensure it matches
                    # (Gross Profit = Revenue - Cost)
                    gross_profit = revenue - cost_of_rev
                    
                    # 5. Calculate "All Other Expenses"
                    # We force this math so the Sankey diagram balances perfectly.
                    # (Expenses = Gross Profit - Net Income)
                    op_expenses = gross_profit - net_income
                    
                    # Store clean numbers
                    financials_data = {
                        "year": "2024",
                        "revenue": float(revenue),
                        "cost_of_revenue": float(cost_of_rev),
                        "gross_profit": float(gross_profit),
                        "op_expenses": float(op_expenses),
                        "net_income": float(net_income)
                    }
            except Exception as e: 
                print(f"   ⚠️ Financials error: {e}")
                pass

            # --- 6. ASSEMBLE OBJECT ---
            stock_data.append({
                "symbol": symbol,
                "name": static["name"],
                "price": round(current_price, 2),
                "change": round(change, 2),
                "change_percent": round(change_percent, 2),
                "market_cap": market_cap,
                "description": static["description"],
                "ceo": static["ceo"],
                "hq": static["hq"],
                "employees": static["employees"],
                "website": static["website"],
                "sector": static["sector"],
                "industry": static["industry"],
                "profit_margin": round(profit_margin * 100, 2) if profit_margin else 0,
                "roe": round(roe * 100, 2) if roe else 0,
                "target_price": target_price,
                "high_52": round(high_52, 2),
                "low_52": round(low_52, 2),
                "beta": round(beta, 2),
                "sharpe_ratio": sharpe_ratio,
                "sortino_ratio": sortino_ratio,
                "max_drawdown_pct": max_drawdown,
                "full_history": full_history,
                "financials": financials_data,
                "verdict": "HOLD"
            })
            
        except Exception as e:
            print(f"❌ Failed {symbol}: {e}")

    with open(OUTPUT_FILE, "w") as f:
        json.dump(stock_data, f, indent=4)
    
    print(f"✅ Success! Data saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    get_daily_update()