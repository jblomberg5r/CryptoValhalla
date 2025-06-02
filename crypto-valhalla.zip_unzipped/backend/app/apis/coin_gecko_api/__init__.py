from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
import requests
import databutton as db
from typing import List, Dict, Any, Optional
import time

router = APIRouter(prefix="/cryptovalhalla/coingecko", tags=["CoinGecko"])

# --- Pydantic Models ---
class MarketData(BaseModel):
    id: str
    symbol: str
    name: str
    image: str
    current_price: Optional[float] = None
    market_cap: Optional[float] = None
    market_cap_rank: Optional[int] = None
    total_volume: Optional[float] = None
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    price_change_24h: Optional[float] = None
    price_change_percentage_24h: Optional[float] = None
    market_cap_change_24h: Optional[float] = None
    market_cap_change_percentage_24h: Optional[float] = None
    circulating_supply: Optional[float] = None
    total_supply: Optional[float] = None
    max_supply: Optional[float] = None
    ath: Optional[float] = None
    ath_change_percentage: Optional[float] = None
    ath_date: Optional[str] = None
    atl: Optional[float] = None
    atl_change_percentage: Optional[float] = None
    atl_date: Optional[str] = None
    roi: Optional[Dict[str, Any]] = None # Region of Interest, can be complex
    last_updated: Optional[str] = None

class MarketDataResponse(BaseModel):
    data: List[MarketData]
    source: str = "CoinGecko"

# --- Constants ---
COINGECKO_API_BASE_URL = "https://api.coingecko.com/api/v3"
# Cache duration in seconds (e.g., 5 minutes)
CACHE_DURATION_SECONDS = 5 * 60 

# --- Helper Functions ---
def _fetch_from_coingecko(endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
    """Helper function to fetch data from CoinGecko API."""
    # In a real app, consider using db.secrets.get("COINGECKO_API_KEY") if you have a Pro API key
    # headers = {"x-cg-demo-api-key": db.secrets.get("COINGECKO_API_KEY")} # Example if key was stored
    # For public API, no key is strictly needed for most endpoints but good to be aware of rate limits.
    url = f"{COINGECKO_API_BASE_URL}{endpoint}"
    try:
        # print(f"Fetching CoinGecko data from: {url} with params: {params}")
        response = requests.get(url, params=params, timeout=10)  # 10 second timeout
        response.raise_for_status()  # Raises HTTPError for bad responses (4XX or 5XX)
        return response.json()
    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code if e.response is not None else 500
        error_detail = e.response.text if e.response is not None and e.response.text else str(e)
        
        # Log the actual error from CoinGecko for debugging
        print(f"CoinGecko API HTTPError: Status {status_code}, Detail: {error_detail}, URL: {url}, Params: {params}")

        if status_code == 400:
            raise HTTPException(status_code=400, detail=f"Bad request to CoinGecko API (endpoint: {endpoint}). Error: {error_detail[:200]}")
        elif status_code == 401: # Should not happen with public API unless an API key is invalid
            raise HTTPException(status_code=401, detail=f"Unauthorized by CoinGecko API. Check API key if used. Error: {error_detail[:200]}")
        elif status_code == 403:
            raise HTTPException(status_code=403, detail=f"Forbidden by CoinGecko API. May indicate WAF block or permission issue. Error: {error_detail[:200]}")
        elif status_code == 404:
            # For /coins/markets, an invalid coin ID in `ids` param usually results in an empty list for that ID, not a 404 for the whole request.
            # A 404 is more likely if the base `endpoint` itself is wrong.
            raise HTTPException(status_code=404, detail=f"CoinGecko API endpoint '{endpoint}' not found. Error: {error_detail[:200]}")
        elif status_code == 429:
            raise HTTPException(status_code=429, detail=f"Rate limited by CoinGecko API. Try again later. Error: {error_detail[:200]}")
        else: # Other 4xx/5xx errors
            final_detail = f"Error from CoinGecko API (endpoint: {endpoint}, status {status_code}): {error_detail[:200]}"
            raise HTTPException(status_code=status_code, detail=final_detail)
    except requests.exceptions.Timeout:
        print(f"CoinGecko API Timeout: URL: {url}, Params: {params}")
        raise HTTPException(status_code=408, detail=f"Request to CoinGecko API timed out (endpoint: {endpoint}).")
    except requests.exceptions.RequestException as e: # Catches other network errors, DNS issues etc.
        print(f"CoinGecko API RequestException: {e}, URL: {url}, Params: {params}")
        raise HTTPException(status_code=503, detail=f"Network error connecting to CoinGecko API (endpoint: {endpoint}): {str(e)}")

# --- API Endpoints ---
@router.get("/market_data", response_model=MarketDataResponse)
async def get_market_data(
    # user: AuthorizedUser,  # Removed to make endpoint public
    vs_currency: str = Query("usd", description="The target currency of market data (usd, eur, sek)", pattern="^(usd|eur|sek)$"),
    ids: Optional[str] = Query(None, description="Comma-separated list of coin ids to filter by (e.g., bitcoin,ethereum)"),
    per_page: int = Query(100, description="Total results per page", ge=1, le=250),
    page: int = Query(1, description="Page through results", ge=1)
):
    """Fetches cryptocurrency market data from CoinGecko.
    
    Supports pagination and filtering by specific coin IDs.
    Includes basic caching to reduce API load.
    """
    # Sanitize ids for cache key: replace commas with underscores, handle None case
    sanitized_ids = ids.replace(',', '_') if ids else "all"
    cache_key = f"market_data_{vs_currency}_{sanitized_ids}_{per_page}_{page}"
    
    cached_data = None # Initialize cached_data to None
    try:
        # Attempt to get data from cache. default=None should prevent FileNotFoundError if key doesn't exist.
        retrieved_value = db.storage.json.get(cache_key, default=None)
        if retrieved_value is not None: # Check if something was actually retrieved
            cached_data = retrieved_value
        else:
            # This means the key was not found, and default (None) was returned by db.storage.json.get
            print(f"Cache miss for {cache_key} (key not found, default None returned).")
    except FileNotFoundError: 
        # This block is a safeguard. Ideally, default=None in db.storage.json.get should prevent this.
        print(f"Cache miss for {cache_key} (FileNotFoundError caught, db.storage.json.get default=None might not cover all cases).")
        # cached_data remains None as initialized
    except Exception as e:
        # Catch any other unexpected errors during cache retrieval and log them.
        # Proceed as if it's a cache miss to ensure app functionality.
        print(f"Unexpected error retrieving cache for {cache_key}: {type(e).__name__} - {e}. Assuming cache miss.")
        # cached_data remains None as initialized

    if cached_data:
        # Check if cache is still valid
        timestamp, data = cached_data.get("timestamp"), cached_data.get("data")
        if timestamp and data is not None and (time.time() - timestamp < CACHE_DURATION_SECONDS):
            print(f"Returning cached data for {cache_key}")
            return MarketDataResponse(data=data, source="CoinGecko - Cache")
        else:
            if not timestamp or data is None:
                print(f"Cache invalid for {cache_key} (missing timestamp or data). Re-fetching.")
            else:
                print(f"Cache expired for {cache_key}. Re-fetching.")

    params = {
        "vs_currency": vs_currency,
        "order": "market_cap_desc",
        "per_page": per_page,
        "page": page,
        "sparkline": "false",
        "locale": "en"
    }
    if ids:
        params["ids"] = ids

    try:
        raw_data = _fetch_from_coingecko("/coins/markets", params=params)
        # Store new data in cache with current timestamp
        db.storage.json.put(cache_key, {"timestamp": time.time(), "data": raw_data})
        print(f"Fetched fresh data from CoinGecko for {cache_key} and cached it.")
        return MarketDataResponse(data=raw_data)
    except HTTPException as e: # Catch HTTPExceptions raised by _fetch_from_coingecko
        raise e
    except Exception as e:
        print(f"Error processing CoinGecko data: {e}")
        # This catches any other unexpected errors during processing
        raise HTTPException(status_code=500, detail=f"Internal server error processing CoinGecko data: {e}")

# Placeholder for historical data endpoint (Sub-task 4)
# @router.get("/historical_data")
# async def get_historical_data():
#     pass

# TODO:
# - Consider adding a secret for COINGECKO_API_KEY if using a Pro key.
# - Expand error handling for specific CoinGecko API errors (e.g., rate limits, invalid coin ID).
# - Refine Pydantic models if more specific fields are needed or some are always present.
