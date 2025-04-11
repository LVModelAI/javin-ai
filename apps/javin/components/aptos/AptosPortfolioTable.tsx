import React from "react";

// Type definitions for tokens (NFTs) and coins
interface TokenCurrentData {
  token_name: string;
  token_standard: string;
  token_uri: string;
}

interface OwnedToken {
  token_standard: string;
  token_data_id: string;
  owner_address: string;
  amount: number;
  current_token_data: TokenCurrentData;
}

interface CoinMetadata {
  name: string;
  symbol: string;
  decimals: number;
  token_standard: string;
}

interface CoinData {
  amount: number;
  asset_type: string;
  metadata: CoinMetadata;
}

interface PortfolioResult {
  ownedTokens?: {
    current_token_ownerships_v2: OwnedToken[];
  };
  ownedCoins?: CoinData[];
}

interface AptosPortfolioTableProps {
  result: PortfolioResult;
}

// Helper function to shorten token IDs (first 8 and last 8 characters)
const shortenTokenId = (tokenId: string): string => {
  if (tokenId.length <= 16) return tokenId;
  return `${tokenId.substring(0, 8)}...${tokenId.substring(
    tokenId.length - 8
  )}`;
};

const AptosPortfolioTable: React.FC<AptosPortfolioTableProps> = ({
  result,
}) => {
  console.log("AptosPortfolioTable result is -- ", result);
  const tokens = result?.ownedTokens?.current_token_ownerships_v2 || [];
  const coins = result?.ownedCoins || [];

  return (
    <>
      {/* Coins Outer Table */}
      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white  rounded-lg w-full max-w-lg  ">
        {/* Header for Coins */}
        <div className="flex flex-col p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex flex-row gap-1 justify-between items-center">
            <h2 className="text-lg font-semibold">Owned Coins</h2>
            {coins.length > 0 && (
              <div>
                <span className="text-xl font-bold">{coins.length}</span>
                <span className="text-sm ml-1">coins</span>
              </div>
            )}
          </div>
        </div>
        {/* Coins Table Content */}
        <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar mt-2">
          {coins.length === 0 ? (
            <div className="text-gray-600 dark:text-gray-400">
              No coins available.
            </div>
          ) : (
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-neutral-200 dark:bg-neutral-700">
                  <th className="border px-2 py-2 text-sm">Name</th>
                  <th className="border px-2 py-2 text-sm">Symbol</th>
                  <th className="border px-2 py-2 text-sm">Amt</th>
                  <th className="border px-2 py-2 text-sm">Std.</th>
                </tr>
              </thead>
              <tbody>
                {coins.map((coin, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="border px-2 py-2 text-sm">
                      {coin.metadata.name}
                    </td>
                    <td className="border px-2 py-2 text-sm">
                      {coin.metadata.symbol}
                    </td>
                    <td className="border px-2 py-2 text-sm">
                      {coin.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: coin.metadata.decimals,
                      })}
                    </td>
                    <td className="border px-2 py-2 text-sm">
                      {coin.metadata.token_standard}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Tokens Outer Table */}
      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white  rounded-lg w-full max-w-lg mt-5">
        {/* Header for Tokens */}
        <div className="flex flex-col p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex flex-row gap-1 justify-between items-center">
            <h2 className="text-lg font-semibold">Owned Tokens</h2>
            {tokens.length > 0 && (
              <div>
                <span className="text-xl font-bold">{tokens.length}</span>
                <span className="text-sm ml-1">tokens</span>
              </div>
            )}
          </div>
        </div>
        {/* Tokens Table Content */}
        <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar ">
          {tokens.length === 0 ? (
            <div className="text-gray-600 dark:text-gray-400">
              No tokens available.
            </div>
          ) : (
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-neutral-200 dark:bg-neutral-700">
                  <th className="border px-2 py-2 text-sm">Name</th>
                  <th className="border px-2 py-2 text-sm">Token ID</th>
                  <th className="border px-2 py-2 text-sm">Std.</th>
                  <th className="border px-2 py-2 text-sm">Amt</th>
                  <th className="border px-2 py-2 text-sm">URI</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="border px-2 py-2 text-sm">
                      {token.current_token_data.token_name}
                    </td>
                    <td className="border px-2 py-2 text-sm">
                      {shortenTokenId(token.token_data_id)}
                    </td>
                    <td className="border px-2 py-2 text-sm">
                      {token.token_standard}
                    </td>
                    <td className="border px-2 py-2 text-sm">{token.amount}</td>
                    <td className="border px-2 py-2 text-sm">
                      <a
                        href={token.current_token_data.token_uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default AptosPortfolioTable;
