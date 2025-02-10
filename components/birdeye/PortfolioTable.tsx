import Image from "next/image";
import React from "react";

interface Token {
  name: string | null;
  symbol: string;
  chainId: string;
  balance: string;
  uiAmount: number;
  valueUsd?: number;
  logoURI?: string;
}

interface ChainPortfolio {
  success: boolean;
  data: {
    wallet: string;
    totalUsd: number;
    items: Token[];
  };
  message?: string;
}

interface PortfolioResponse {
  [chain: string]: ChainPortfolio;
}

const PortfolioTable: React.FC<{ result: PortfolioResponse | null }> = ({
  result,
}) => {
  if (!result)
    return <div className="text-white">No portfolio data available.</div>;

  // console.log(result);

  // Aggregate all tokens across chains, filtering out zero-balance tokens
  const groupedTokens = Object.entries(result).reduce<{
    [chain: string]: Token[];
  }>((acc, [chain, chainData]) => {
    if (!chainData.success || !chainData.data.items.length) return acc;

    const nonZeroTokens = chainData.data.items.filter(
      (token) => token.uiAmount > 0
    );
    if (nonZeroTokens.length) {
      acc[chain] = nonZeroTokens;
    }
    return acc;
  }, {});

  // Calculate total portfolio value
  const totalPortfolioValue = Object.values(result).reduce(
    (total, chainData) => total + chainData.data.totalUsd,
    0
  );

  const chainKeys = Object.keys(groupedTokens);

  return (
    <div className="bg-black text-white px-4 rounded-lg w-full max-w-md border">
      <div className="flex flex-row justify-between items-center border-b p-2 border-gray-700">
        <h2 className="text-sm font-semibold">Portfolio</h2>
        <span className="font-semibold">${totalPortfolioValue.toFixed(2)}</span>
      </div>
      <div className="text-sm">
        {chainKeys.length === 0 ? (
          <div className="p-2 text-gray-400">No valid token holdings.</div>
        ) : (
          chainKeys.map((chain) => (
            <div key={chain}>
              {groupedTokens[chain].map((token, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between py-2 ${
                    index !== groupedTokens[chain].length - 1 ? " " : "border-b"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Image
                      src={`/images/chain-logo/${chain}.png`}
                      alt={token.symbol}
                      className="w-6 h-6 mr-2"
                      height={50}
                      width={50}
                    />
                    <div className="flex flex-col text-sm">
                      <div className="">{token.symbol}</div>
                      <div className="text-gray-500 capitalize">{chain}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{token.uiAmount.toFixed(6)}</div>
                    {token.valueUsd !== undefined && (
                      <div className="text-gray-400">
                        ${token.valueUsd.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PortfolioTable;
