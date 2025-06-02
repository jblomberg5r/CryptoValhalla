from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any # Removed Tuple for simplicity as CoinGecko returns list of lists
import requests
import time # For rate limiting

router = APIRouter(prefix="/historical_data", tags=["Historical Data"])

# --- Pydantic Models ---

class BatchMarketChartRequest(BaseModel):
    coin_ids: List[str] = Field(..., min_length=1, description="List of CoinGecko coin IDs (e.g., ['bitcoin', 'ethereum']).")
    vs_currency: str = Field(..., description="The target currency of market data (e.g., 'usd', 'eur', 'sek').")
    days: int = Field(..., gt=0, le=10000, description="Data up to number of days ago (e.g., 1, 7, 30, 365). Max 10000 for safety.")

class CoinHistoricalData(BaseModel):
    # CoinGecko returns [timestamp (ms), value]
    prices: List[List[Any]] = Field(..., description="List of [timestamp, price] data points.")
    market_caps: List[List[Any]] = Field(..., description="List of [timestamp, market_cap] data points.")
    total_volumes: List[List[Any]] = Field(..., description="List of [timestamp, total_volume] data points.")

class BatchMarketChartResponse(BaseModel):
    data: Dict[str, CoinHistoricalData] = Field(default_factory=dict, description="Successfully fetched historical data, keyed by coin ID.")
    errors: Dict[str, str] = Field(default_factory=dict, description="Errors encountered for specific coin IDs.")

COINGECKO_API_BASE_URL = "https://api.coingecko.com/api/v3"

# --- Helper Functions ---

def fetch_coin_market_chart_from_coingecko(coin_id: str, vs_currency: str, days: int) -> Dict[str, Any]:
    """
    Fetches market chart data for a single coin from CoinGecko.
    Raises HTTPException for CoinGecko API errors if they occur.
    """
    url = f"{COINGECKO_API_BASE_URL}/coins/{coin_id}/market_chart"
    params = {
        "vs_currency": vs_currency,
        "days": days,
        # "interval": "daily" # CoinGecko infers interval based on 'days'. 'daily' for days > 90.
    }
    # print(f"Fetching CoinGecko data for {coin_id}, currency: {vs_currency}, days: {days}")
    try:
        response = requests.get(url, params=params, timeout=10) # 10 second timeout
        response.raise_for_status()  # Raises HTTPError for bad responses (4XX or 5XX)
        # print(f"Successfully fetched data for {coin_id}: {response.json()}")
        return response.json()
    except requests.exceptions.HTTPError as e:
        # print(f"CoinGecko HTTPError for {coin_id}: {e.response.status_code} - {e.response.text if e.response else 'No response text'}")
        status_code = e.response.status_code if e.response is not None else 500
        error_detail = e.response.text if e.response is not None and e.response.text else str(e)
        
        if status_code == 404:
            raise HTTPException(status_code=404, detail=f"Coin '{coin_id}' not found on CoinGecko.")
        elif status_code == 429:
            raise HTTPException(status_code=429, detail=f"Rate limited by CoinGecko for coin '{coin_id}'. Try again later.")
        else:
            # Ensure detail is a string
            detail_str = f"Error from CoinGecko for '{coin_id}' (status {status_code}): {error_detail}"
            # Sanitize error_detail if it's too long or complex, or just use a generic message for some statuses
            if isinstance(error_detail, bytes): # If response.text was bytes
                try:
                    error_detail_str = error_detail.decode('utf-8')
                except UnicodeDecodeError:
                    error_detail_str = "Non-UTF8 error message from CoinGecko"
            elif not isinstance(error_detail, str):
                error_detail_str = str(error_detail)
            else:
                error_detail_str = error_detail
            
            final_detail = f"Error from CoinGecko for '{coin_id}' (status {status_code}): {error_detail_str[:200]}" # Truncate long messages
            raise HTTPException(status_code=status_code, detail=final_detail)

    except requests.exceptions.Timeout:
        # print(f"CoinGecko Timeout for {coin_id}")
        raise HTTPException(status_code=408, detail=f"Request to CoinGecko timed out for coin '{coin_id}'.")
    except requests.exceptions.RequestException as e: # Catches other network errors, etc.
        # print(f"CoinGecko RequestException for {coin_id}: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Network error while fetching data for '{coin_id}': {str(e)}")

# --- API Endpoint ---

@router.post(
    "/batch_market_chart",
    response_model=BatchMarketChartResponse,
    summary="Get Historical Market Data for Multiple Coins",
    description="Fetches historical market data (prices, market caps, total volumes) for a list of cryptocurrencies over a specified number of days."
)
async def get_batch_market_chart(request_body: BatchMarketChartRequest) -> BatchMarketChartResponse:
    """
    Provides historical price, market cap, and total volume data for multiple specified cryptocurrencies.
    The data is fetched from the CoinGecko API for the number of `days` requested, in the specified `vs_currency`.
    If data for a particular coin cannot be fetched (e.g., invalid ID, rate limit), an error for that coin will be
    included in the `errors` field of the response, while data for other coins may still be returned successfully.
    """
    response_data_collected: Dict[str, CoinHistoricalData] = {}
    response_errors_collected: Dict[str, str] = {}

    # Pydantic gt=0 for days and min_length=1 for coin_ids should handle these,
    # but an explicit check for coin_ids empty list before loop is fine.
    if not request_body.coin_ids: # Should be caught by min_length=1 in Pydantic
         raise HTTPException(status_code=400, detail="coin_ids list cannot be empty.")

    for coin_id in request_body.coin_ids:
        try:
            # print(f"Processing coin: {coin_id}")
            # FastAPI runs synchronous functions in a thread pool, so calling the sync helper here is okay.
            raw_data = fetch_coin_market_chart_from_coingecko(coin_id, request_body.vs_currency, request_body.days)
            
            prices_data = raw_data.get("prices")
            market_caps_data = raw_data.get("market_caps")
            total_volumes_data = raw_data.get("total_volumes")

            # Basic validation that we got lists, CoinGecko should always return them if the call is successful
            if not isinstance(prices_data, list) or \
               not isinstance(market_caps_data, list) or \
               not isinstance(total_volumes_data, list):
                # print(f"Unexpected data structure from CoinGecko for {coin_id}. Prices: {type(prices_data)}, Caps: {type(market_caps_data)}, Vols: {type(total_volumes_data)}")
                response_errors_collected[coin_id] = f"Unexpected data structure received from CoinGecko for {coin_id}."
                continue

            # Ensure that we have at least some data to return for the coin before adding it.
            # CoinGecko might return empty lists if data truly unavailable for a valid coin.
            # The task implies we should return data if available.
            # If all lists are empty, it might be an issue or just no data.
            # Let's assume CoinGecko returns data if it exists. An empty list is valid data (no transactions in period).
            
            coin_data = CoinHistoricalData(
                prices=prices_data,
                market_caps=market_caps_data,
                total_volumes=total_volumes_data
            )
            response_data_collected[coin_id] = coin_data
            
            # Small delay to respect public API rate limits (e.g., 10-50 reqs/min for CoinGecko free).
            # This is a simple approach. More robust would be a token bucket or leaky bucket algorithm.
            time.sleep(1.5) # Increased sleep to be safer with CoinGecko free tier (e.g. 10-30/min means 2-6s per req)

        except HTTPException as e: # Catch specific HTTPExceptions raised by our helper or this function
            # print(f"HTTPException for {coin_id}: {e.detail}")
            response_errors_collected[coin_id] = e.detail
        except Exception as e: # Catch any other unexpected errors during processing for a specific coin
            # print(f"Unexpected error processing {coin_id}: {type(e).__name__} - {str(e)}")
            response_errors_collected[coin_id] = f"An unexpected error occurred while processing data for '{coin_id}': {type(e).__name__} - {str(e)}"
            
    return BatchMarketChartResponse(data=response_data_collected, errors=response_errors_collected)
