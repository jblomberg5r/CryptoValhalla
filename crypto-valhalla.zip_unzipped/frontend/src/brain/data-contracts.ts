/** BatchMarketChartRequest */
export interface BatchMarketChartRequest {
  /**
   * Coin Ids
   * List of CoinGecko coin IDs (e.g., ['bitcoin', 'ethereum']).
   * @minItems 1
   */
  coin_ids: string[];
  /**
   * Vs Currency
   * The target currency of market data (e.g., 'usd', 'eur', 'sek').
   */
  vs_currency: string;
  /**
   * Days
   * Data up to number of days ago (e.g., 1, 7, 30, 365). Max 10000 for safety.
   * @exclusiveMin 0
   * @max 10000
   */
  days: number;
}

/** BatchMarketChartResponse */
export interface BatchMarketChartResponse {
  /**
   * Data
   * Successfully fetched historical data, keyed by coin ID.
   */
  data?: Record<string, CoinHistoricalData>;
  /**
   * Errors
   * Errors encountered for specific coin IDs.
   */
  errors?: Record<string, string>;
}

/** CoinHistoricalData */
export interface CoinHistoricalData {
  /**
   * Prices
   * List of [timestamp, price] data points.
   */
  prices: any[][];
  /**
   * Market Caps
   * List of [timestamp, market_cap] data points.
   */
  market_caps: any[][];
  /**
   * Total Volumes
   * List of [timestamp, total_volume] data points.
   */
  total_volumes: any[][];
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** MarketData */
export interface MarketData {
  /** Id */
  id: string;
  /** Symbol */
  symbol: string;
  /** Name */
  name: string;
  /** Image */
  image: string;
  /** Current Price */
  current_price?: number | null;
  /** Market Cap */
  market_cap?: number | null;
  /** Market Cap Rank */
  market_cap_rank?: number | null;
  /** Total Volume */
  total_volume?: number | null;
  /** High 24H */
  high_24h?: number | null;
  /** Low 24H */
  low_24h?: number | null;
  /** Price Change 24H */
  price_change_24h?: number | null;
  /** Price Change Percentage 24H */
  price_change_percentage_24h?: number | null;
  /** Market Cap Change 24H */
  market_cap_change_24h?: number | null;
  /** Market Cap Change Percentage 24H */
  market_cap_change_percentage_24h?: number | null;
  /** Circulating Supply */
  circulating_supply?: number | null;
  /** Total Supply */
  total_supply?: number | null;
  /** Max Supply */
  max_supply?: number | null;
  /** Ath */
  ath?: number | null;
  /** Ath Change Percentage */
  ath_change_percentage?: number | null;
  /** Ath Date */
  ath_date?: string | null;
  /** Atl */
  atl?: number | null;
  /** Atl Change Percentage */
  atl_change_percentage?: number | null;
  /** Atl Date */
  atl_date?: string | null;
  /** Roi */
  roi?: Record<string, any> | null;
  /** Last Updated */
  last_updated?: string | null;
}

/** MarketDataResponse */
export interface MarketDataResponse {
  /** Data */
  data: MarketData[];
  /**
   * Source
   * @default "CoinGecko"
   */
  source?: string;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

export type CheckHealthData = HealthResponse;

export type GetBatchMarketChartData = BatchMarketChartResponse;

export type GetBatchMarketChartError = HTTPValidationError;

export interface GetMarketDataParams {
  /**
   * Vs Currency
   * The target currency of market data (usd, eur, sek)
   * @default "usd"
   * @pattern ^(usd|eur|sek)$
   */
  vs_currency?: string;
  /**
   * Ids
   * Comma-separated list of coin ids to filter by (e.g., bitcoin,ethereum)
   */
  ids?: string | null;
  /**
   * Per Page
   * Total results per page
   * @min 1
   * @max 250
   * @default 100
   */
  per_page?: number;
  /**
   * Page
   * Page through results
   * @min 1
   * @default 1
   */
  page?: number;
}

export type GetMarketDataData = MarketDataResponse;

export type GetMarketDataError = HTTPValidationError;
