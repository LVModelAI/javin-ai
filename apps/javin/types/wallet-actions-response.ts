export type PortfolioData = {
  type: "portfolio";
  id: string;
  currency: string;
  attributes: {
    positions_distribution_by_type: {
      wallet: number;
      deposited: number;
      borrowed: number;
      locked: number;
      staked: number;
    };
    positions_distribution_by_chain: {
      [key: string]: number | undefined; // For additional chains
    };
    total: {
      positions: number | null;
    };
    changes: {
      absolute_1d: number;
      percent_1d: number;
    };
  };
};
export type PortfolioResponse = {
  links: {
    self: string;
  };
  data: PortfolioData;
};

export type TokenItem = {
  address: string;
  decimals: number;
  balance: number;
  uiAmount: number;
  chainId: string;
  name: string;
  symbol: string;
  logoURI?: string;
  icon?: string;
  priceUsd: number;
  valueUsd: number;
};

export type BirdeyePortfolioResponse = {
  success: boolean;
  data: {
    wallet: string;
    totalUsd: number;
    items: TokenItem[];
  };
};
