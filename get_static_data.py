import yfinance as yf
import json
import os

# --- YOUR STOCK LIST ---
TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX",
    "JPM", "BAC", "V", "MA",
    "JNJ", "PFE", "UNH", "LLY",
    "XOM", "CVX",
    "KO", "PEP", "MCD", "WMT", "COST",
    "BA", "CAT", "MMM"
]

PROFILE_FILE = "company_profiles.json"

def load_profiles():
    if os.path.exists(PROFILE_FILE):
        try:
            with open(PROFILE_FILE, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_profiles(profiles):
    with open(PROFILE_FILE, "w") as f:
        json.dump(profiles, f, indent=4)

def run_static_update():
    profiles = load_profiles()
    modified = False
    
    print(f"📂 Updating Static Data for {len(TICKERS)} companies...")
    
    for symbol in TICKERS:
        # Check if we already have full static data
        if (symbol in profiles 
            and "name" in profiles[symbol] 
            and "ceo" in profiles[symbol]
            and "sector" in profiles[symbol]):
            print(f"✅ {symbol} already cached. Skipping.")
            continue

        print(f"📥 Downloading static profile for {symbol}...")
        try:
            stock = yf.Ticker(symbol)
            info = stock.info
            
            # --- EXTRACT STATIC INFO ---
            
            # 1. Headquarters Logic
            city = info.get('city', '')
            state = info.get('state', '')
            country = info.get('country', '')
            hq_parts = [p for p in [city, state, country] if p]
            headquarters = ", ".join(hq_parts) if hq_parts else "N/A"
            
            # 2. CEO Logic
            officers = info.get('companyOfficers', [])
            ceo_name = "N/A"
            if officers:
                for officer in officers:
                    title = officer.get('title', '').lower()
                    if 'ceo' in title or 'chief executive officer' in title:
                        ceo_name = officer.get('name', 'N/A')
                        break
                if ceo_name == "N/A" and len(officers) > 0:
                    ceo_name = officers[0].get('name', 'N/A')

            # 3. Description (Preserve custom AI descriptions if they exist!)
            current_desc = profiles.get(symbol, {}).get("description", info.get('longBusinessSummary', "No description available."))

            # 4. Save to Profile
            profiles[symbol] = {
                "name": info.get('shortName', info.get('longName', symbol)),
                "description": current_desc,
                "ceo": ceo_name,
                "hq": headquarters,
                "employees": info.get('fullTimeEmployees', 0),
                "website": info.get('website', 'N/A'),
                "sector": info.get('sector', "Unknown"),
                "industry": info.get('industry', "Unknown")
            }
            modified = True
            
        except Exception as e:
            print(f"❌ Failed to fetch static data for {symbol}: {e}")

    if modified:
        save_profiles(profiles)
        print("💾 company_profiles.json updated successfully.")
    else:
        print("✨ No changes needed. Database is up to date.")

if __name__ == "__main__":
    run_static_update()