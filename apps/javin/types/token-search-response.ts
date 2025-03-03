export type TokenSearchData = {
  type: "fungibles";
  id: string;
  attributes: {
    name: string;
    symbol: string;
    description: string;
    icon: {
      url: string;
    };
    flags: {
      verified: boolean;
    };
    external_links: {
      type: string;
      name: string;
      url: string;
    }[];
    implementations: {
      chain_id: string;
      address: string;
      decimals: number;
    }[];
    market_data: {
      total_supply: number;
      circulating_supply: number;
      market_cap: number;
      fully_diluted_valuation: number;
      price: number;
      changes: {
        percent_1d: number;
        percent_30d: number;
        percent_90d: number;
        percent_365d: number;
      };
    };
  };
  relationships: {
    chart_day: {
      links: { related: string };
      data: { type: string; id: string };
    };
    chart_hour: {
      links: { related: string };
      data: { type: string; id: string };
    };
    chart_max: {
      links: { related: string };
      data: { type: string; id: string };
    };
    chart_month: {
      links: { related: string };
      data: { type: string; id: string };
    };
    chart_week: {
      links: { related: string };
      data: { type: string; id: string };
    };
    chart_year: {
      links: { related: string };
      data: { type: string; id: string };
    };
  };
  links: {
    self: string;
  };
};

export type TokenSearchResponse = {
  links: {
    self: string;
  };
  data: TokenSearchData[];
};

export interface BirdeyeTokenData {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  marketCap: number;
  fdv: number;
  liquidity: number;
  lastTradeUnixTime: number;
  lastTradeHumanTime: string;
  price: number;
  priceChange24hPercent: number;
  uniqueWallet24h: number | null;
  volume24hUSD: number;
  circulatingSupply: number;
  totalSupply: number;
  holder: number;
  trade24h: number;
  sell24h: number;
  buy24h: number;
  numberMarkets: number;
  logoURI?: string;
  extensions?: {
    twitter?: string;
    website?: string;
    description?: string;
  };
}

export interface BirdeyeTokenSearchResponse {
  data: BirdeyeTokenData;
  success: boolean;
}
