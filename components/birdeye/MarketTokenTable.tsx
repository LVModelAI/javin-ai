import Image from "next/image";
import React from "react";

interface TokenData {
  name?: string;
  symbol?: string;
  address?: string;
  decimals?: number;
  fdv?: number;
  market_cap?: number;
  liquidity?: number;
  volume_24h_change_percent?: number;
  price?: number;
  price_change_24h_percent?: number;
  network?: string;
  buy_24h?: number;
  sell_24h?: number;
  trade_24h?: number;
  trade_24h_change_percent?: number;
  unique_wallet_24h?: number;
  volume_24h_usd?: number;
  logo_uri?: string;
}

interface APIResponse {
  data: {
    items: {
      type: "token";
      result: TokenData[];
    }[];
  };
  success: boolean;
}

const MarketTokenTable: React.FC<{ result: APIResponse | null }> = ({
  result,
}) => {
  if (!result || !result.success)
    return <div className="text-white">No token data available.</div>;

  const tokenData = result.data.items.find((item) => item.type === "token")
    ?.result as TokenData[] | undefined;

  return (
    <div className="bg-black text-white px-4 rounded-lg w-full max-w-4xl border overflow-x-auto">
      <div className="flex flex-row justify-between items-center border-b p-2 border-gray-700">
        <h2 className="text-sm font-semibold">Token Data</h2>
      </div>
      {tokenData && tokenData.length > 0 ? (
        tokenData.map((token, index) => (
          <div key={index} className="border-b border-gray-700 py-4">
            {token.logo_uri && (
              <div className="flex justify-center">
                <Image
                  src={token.logo_uri}
                  alt={token.symbol || "Token"}
                  className="w-10 h-10"
                  height={50}
                  width={50}
                />
              </div>
            )}
            <table className="w-full text-sm mt-4">
              <tbody>
                <tr className="border-b border-gray-700">
                  <td className="p-2 font-semibold">Name</td>
                  <td className="p-2">{token.name || "-"}</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2 font-semibold">Symbol</td>
                  <td className="p-2">{token.symbol || "-"}</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2 font-semibold">Network</td>
                  <td className="p-2">{token.network || "-"}</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2 font-semibold">Price</td>
                  <td className="p-2">${token.price?.toFixed(2) || "-"}</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2 font-semibold">24h Change (%)</td>
                  <td className="p-2">
                    {token.price_change_24h_percent?.toFixed(2) || "-"}%
                  </td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2 font-semibold">Market Cap</td>
                  <td className="p-2">
                    ${token.market_cap?.toLocaleString() || "-"}
                  </td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2 font-semibold">Liquidity</td>
                  <td className="p-2">
                    ${token.liquidity?.toLocaleString() || "-"}
                  </td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2 font-semibold">Volume (24h)</td>
                  <td className="p-2">
                    ${token.volume_24h_usd?.toLocaleString() || "-"}
                  </td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2 font-semibold">Trades (24h)</td>
                  <td className="p-2">{token.trade_24h || "-"}</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2 font-semibold">Unique Wallets (24h)</td>
                  <td className="p-2">{token.unique_wallet_24h || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <div className="p-2 text-center text-gray-400">
          No token data available.
        </div>
      )}
    </div>
  );
};

export default MarketTokenTable;
