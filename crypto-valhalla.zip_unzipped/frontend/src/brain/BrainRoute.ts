import { BatchMarketChartRequest, CheckHealthData, GetBatchMarketChartData, GetMarketDataData } from "./data-contracts";

export namespace Brain {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Fetches historical market data (prices, market caps, total volumes) for a list of cryptocurrencies over a specified number of days.
   * @tags Historical Data, dbtn/module:historical_data, dbtn/hasAuth
   * @name get_batch_market_chart
   * @summary Get Historical Market Data for Multiple Coins
   * @request POST:/routes/historical_data/batch_market_chart
   */
  export namespace get_batch_market_chart {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BatchMarketChartRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GetBatchMarketChartData;
  }

  /**
   * @description Fetches cryptocurrency market data from CoinGecko. Supports pagination and filtering by specific coin IDs. Includes basic caching to reduce API load.
   * @tags CoinGecko, dbtn/module:coin_gecko_api, dbtn/hasAuth
   * @name get_market_data
   * @summary Get Market Data
   * @request GET:/routes/cryptovalhalla/coingecko/market_data
   */
  export namespace get_market_data {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMarketDataData;
  }
}
