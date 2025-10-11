import { PortfolioData } from "@javin/shared/lib/ai/tools/zerion/wallets/getEvmMultiChainWalletPortfolio";
import { getPercentChangeColor } from "@javin/shared/lib/utils/utils";
import React from "react";

interface PositionItem {
  id: string;
  chain: string;
  name: string;
  symbol: string;
  value: number;
  quantity: number;
  price: number;
  percent_change_1d: number;
  icon?: string;
}

interface PortfolioProps {
  result: {
    summary: PortfolioData;
    positions: PositionItem[];
    currency: string;
  } | null;
}

const PortfolioTable: React.FC<PortfolioProps> = ({ result }) => {
  if (!result || !result.summary?.attributes) return null;

  const { summary, positions, currency } = result;
  const { attributes } = summary;
  const totalPositions = attributes.total?.positions;
  const percentChange = attributes.changes?.percent_1d;
  const absoluteChange = attributes.changes?.absolute_1d;
  const chains = attributes.positions_distribution_by_chain
    ? Object.entries(attributes.positions_distribution_by_chain)
    : [];

  // ✅ Filter out small positions (< $0.10)
  const filteredPositions = positions.filter((pos) => pos.value >= 0.1);

  // ✅ Group by chain and sort within each group by value (desc)
  const groupedByChain = filteredPositions.reduce<
    Record<string, PositionItem[]>
  >((acc, pos) => {
    const chain = pos.chain || "unknown";
    if (!acc[chain]) acc[chain] = [];
    acc[chain].push(pos);
    return acc;
  }, {});

  // ✅ Sort tokens within each chain by value descending
  Object.keys(groupedByChain).forEach((chain) => {
    groupedByChain[chain].sort((a, b) => b.value - a.value);
  });

  // ✅ Sort chain groups by their total chain value descending
  const sortedChains = Object.entries(groupedByChain).sort(
    ([chainA, tokensA], [chainB, tokensB]) => {
      const totalA = tokensA.reduce((sum, t) => sum + t.value, 0);
      const totalB = tokensB.reduce((sum, t) => sum + t.value, 0);
      return totalB - totalA;
    }
  );

  console.log("Grouped positions by chain:", groupedByChain);

  return (
    <div className="text-neutral-800 dark:text-white px-4 py-4 rounded-lg w-full max-w-2xl mt-2 md:mt-0 space-y-4">
      {/* =================== Portfolio Header =================== */}
      <div className="flex flex-col bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-3 rounded-lg">
        <div className="flex flex-col pb-2 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex flex-row gap-1 justify-between">
            <h2 className="text-lg font-semibold">Portfolio</h2>
            {totalPositions && totalPositions > 0 && (
              <div>
                <span className="text-xl font-bold">
                  {totalPositions.toFixed(2)}{" "}
                </span>
                {currency !== "units" && (
                  <span className="text-sm ">{currency?.toUpperCase()}</span>
                )}
              </div>
            )}
          </div>
          {percentChange && (
            <span className="text-sm text-gray-400 float-right">
              24h Change:{" "}
              <span className={getPercentChangeColor(percentChange)}>
                {percentChange.toFixed(2)}% ({absoluteChange.toFixed(2)}{" "}
                {currency?.toUpperCase()})
              </span>
            </span>
          )}
        </div>

        {/* =================== Portfolio Breakdown by Chain =================== */}
        <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {chains.length === 0 ? (
            <div className="text-gray-600 dark:text-gray-400">
              No holdings available.
            </div>
          ) : (
            chains.map(([chain, value]) => (
              <div
                key={chain}
                className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-none"
              >
                <div className="capitalize">{chain}</div>
                <div>
                  <span className="font-semibold">
                    {value ? value.toFixed(5) : "0.00"}{" "}
                  </span>
                  {currency !== "units" && (
                    <span className="text-xs">{currency?.toUpperCase()}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =================== Token-Level Positions Table =================== */}
      <div className="">
        <h3 className="text-lg font-semibold mb-2">Token Positions</h3>

        {filteredPositions.length === 0 ? (
          <div className="text-gray-600 dark:text-gray-400">
            No token-level positions above $0.10 found.
          </div>
        ) : (
          <div className="overflow-x-auto space-y-4 ">
            {sortedChains.map(([chain, tokens]) => {
              const chainTotal = tokens
                .reduce((sum, t) => sum + t.value, 0)
                .toFixed(2);
              return (
                <div
                  key={chain}
                  className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-3 rounded-lg"
                >
                  {/* Chain Header */}
                  <div className="flex justify-between items-center mb-1 border-b border-neutral-300 dark:border-neutral-700 pb-1">
                    <h4 className="text-base font-semibold capitalize">
                      {chain}
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Total:{" "}
                      <span className="font-semibold ">
                        {chainTotal} {currency?.toUpperCase()}
                      </span>
                    </span>
                  </div>

                  {/* Chain Tokens Table */}
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm border-collapse ">
                      <thead className="border-b border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400">
                        <tr>
                          <th className="text-left py-2 px-1">Token</th>
                          <th className="text-right py-2 px-1">
                            Value ({currency?.toUpperCase()})
                          </th>
                          <th className="text-right py-2 px-1">Quantity</th>
                          <th className="text-right py-2 px-1">Price</th>
                          <th className="text-right py-2 px-1">24h %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tokens.map((pos) => (
                          <tr
                            key={pos.id}
                            className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40"
                          >
                            <td className="py-2 px-1 flex items-center gap-2">
                              {pos.icon && (
                                <img
                                  src={pos.icon}
                                  alt={pos.symbol}
                                  className="w-5 h-5 rounded-full"
                                  onError={(e) =>
                                    (e.currentTarget.src =
                                      "/images/chain-logo/default.png")
                                  }
                                />
                              )}
                              <span className="font-medium">
                                {pos.symbol || pos.name}
                              </span>
                            </td>
                            <td className="text-right py-2 px-1 font-semibold">
                              {pos.value?.toFixed(2) || "0.00"}
                            </td>
                            <td className="text-right py-2 px-1">
                              {pos.quantity?.toFixed(4) || "-"}
                            </td>
                            <td className="text-right py-2 px-1">
                              {pos.price?.toFixed(4) || "-"}
                            </td>
                            <td
                              className={`text-right py-2 px-1 ${getPercentChangeColor(
                                pos.percent_change_1d || 0
                              )}`}
                            >
                              {pos.percent_change_1d?.toFixed(2) ?? "0.00"}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {positions.length - filteredPositions.length} more items with value
          less than 0.1 USD
        </p>
      </div>
    </div>
  );
};

export default PortfolioTable;
