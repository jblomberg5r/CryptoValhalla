import {
  BatchMarketChartRequest,
  CheckHealthData,
  GetBatchMarketChartData,
  GetBatchMarketChartError,
  GetMarketDataData,
  GetMarketDataError,
  GetMarketDataParams,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description Fetches historical market data (prices, market caps, total volumes) for a list of cryptocurrencies over a specified number of days.
   *
   * @tags Historical Data, dbtn/module:historical_data, dbtn/hasAuth
   * @name get_batch_market_chart
   * @summary Get Historical Market Data for Multiple Coins
   * @request POST:/routes/historical_data/batch_market_chart
   */
  get_batch_market_chart = (data: BatchMarketChartRequest, params: RequestParams = {}) =>
    this.request<GetBatchMarketChartData, GetBatchMarketChartError>({
      path: `/routes/historical_data/batch_market_chart`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Fetches cryptocurrency market data from CoinGecko. Supports pagination and filtering by specific coin IDs. Includes basic caching to reduce API load.
   *
   * @tags CoinGecko, dbtn/module:coin_gecko_api, dbtn/hasAuth
   * @name get_market_data
   * @summary Get Market Data
   * @request GET:/routes/cryptovalhalla/coingecko/market_data
   */
  get_market_data = (query: GetMarketDataParams, params: RequestParams = {}) =>
    this.request<GetMarketDataData, GetMarketDataError>({
      path: `/routes/cryptovalhalla/coingecko/market_data`,
      method: "GET",
      query: query,
      ...params,
    });
}
