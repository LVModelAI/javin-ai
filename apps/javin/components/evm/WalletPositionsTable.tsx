import { WalletPositionSummary } from "@javin/shared/lib/ai/tools/evm/wallet-positions-evm";
import Image from "next/image";
import React from "react";

function formatNumber(value?: number, decimals: number = 2) {
  if (value === undefined || value === null) return "-";
  if (Math.abs(value) >= 1000) {
    return Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: decimals,
    }).format(value);
  }
  return value.toFixed(decimals);
}

function percentColor(percent?: number) {
  if (percent === undefined || percent === null) return "text-gray-400";
  if (percent > 0) return "text-green-600";
  if (percent < 0) return "text-red-600";
  return "text-gray-400";
}

interface Props {
  result: WalletPositionSummary[] | string | null;
}

const WalletPositionsTable: React.FC<Props> = ({ result }) => {
  if (!result) return null;
  if (typeof result === "string") {
    return (
      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white px-4 py-3 rounded-lg w-full max-w-3xl">
        {result}
      </div>
    );
  }

  const positions = [...result].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  if (positions.length === 0)
    return (
      <div className="text-gray-600 dark:text-gray-400">
        No positions found.
      </div>
    );
  console.log("positions", positions);

  //filter for positions with value > 1 usd
  const filteredPositions = positions.filter((p) => p.value && p.value > 1);
  return (
    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white px-4 py-4 rounded-lg w-full max-w-3xl">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-lg font-semibold">Staking & LP Positions</h2>
        <span className="text-xs text-gray-500">
          {filteredPositions.length} items
        </span>
      </div>

      <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
        {filteredPositions.map((p) => (
          <div key={p.id} className="py-3 flex items-center gap-3">
            <div className="flex items-center justify-center">
              {p.app?.icon_url || p.icon_url ? (
                <Image
                  src={p.app?.icon_url || p.icon_url || ""}
                  alt={p.symbol || p.name || "token"}
                  width={28}
                  height={28}
                  className="rounded"
                />
              ) : (
                <div className="w-7 h-7 rounded bg-neutral-200 dark:bg-neutral-800" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">
                  {p.name || p.symbol || "Position"}
                </span>
                {p.protocol && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {p.protocol}
                  </span>
                )}
                {p.position_type && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {p.position_type}
                  </span>
                )}
                {p.chain_id && (
                  <span className="text-[10px] px-1 py-0.5 rounded uppercase bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                    {p.chain_id}
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                {p.symbol ? `${p.symbol}` : null}
                {/* {p.symbol && p.token_address ? " • " : null} */}
                {/* {p.token_address ? `${p.token_address}` : null} */}
              </div>

              {p.app?.name || p.app?.url ? (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                  {p.app?.name ? p.app.name : ""}
                  {p.app?.name && p.app?.url ? " • " : null}
                  {p.app?.url ? (
                    <a
                      href={p.app.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:no-underline"
                    >
                      Visit app
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-0.5">
              <div className="text-sm font-semibold">
                {formatNumber(p.value, 2)} {p.currencySymbol?.toUpperCase()}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Qty: {formatNumber(p.quantity, 4)}
              </div>
              <div
                className={`text-[11px] ${percentColor(p.changes?.percent_1d)}`}
              >
                {p.changes?.percent_1d !== undefined
                  ? `${p.changes.percent_1d!.toFixed(2)}%`
                  : "-"}
              </div>
            </div>
          </div>
        ))}
        {positions.length - filteredPositions.length > 0 && (
          <div className="text-xs text-gray-500">
            <p className="mt-2">
              {positions.length - filteredPositions.length} more items with
              value less than 1 USD
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletPositionsTable;
