import { getPercentChangeColor } from "@/lib/utils";
import { TokenSearchData } from "@/types/token-search-response";
import Image from "next/image";
import React from "react";

const TokenInfoTable: React.FC<{
  result: TokenSearchData[] | string | null;
}> = ({ result }) => {
  // console.log("token data", result);

  if (!result || result.length === 0 || typeof result == "string")
    return (
      <div className="text-black dark:text-white">No token data available.</div>
    );
  // console.log("result ", result[0].attributes.external_links);
  return (
    <div className="flex flex-col gap-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white rounded-lg p-4 w-full max-w-4xl overflow-x-auto custom-scrollbar">
      {result.map((token, index) => (
        <div
          key={index}
          className={`border-b border-dashed ${
            index === result.length - 1 ? "border-none" : "border-gray-500 pb-5"
          }`}
        >
          {/* Token Header */}
          <div className="flex flex-row justify-between border-b p-2 border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold">
              {token.attributes.name} ({token.attributes.symbol})
            </h2>

            {/* Token Icon */}
            <div className="flex justify-center ">
              {token.attributes.icon?.url && (
                <Image
                  src={token.attributes.icon.url}
                  alt={token.attributes.symbol || "Token"}
                  className="w-10 h-10"
                  height={50}
                  width={50}
                  onError={(e) =>
                    (e.currentTarget.src = "/images/token-placeholder.png")
                  }
                />
              )}
            </div>
          </div>

          {/* Token Data Table */}
          <table className="w-full text-sm mt-4">
            <tbody>
              {[
                ["Name", token.attributes.name],
                ["Symbol", token.attributes.symbol],
                [
                  "Price",
                  token.attributes.market_data.price
                    ? `$${token.attributes.market_data.price.toFixed(8)}`
                    : "-",
                ],
                [
                  "24h Change (%)",
                  token.attributes.market_data.changes.percent_1d ? (
                    <span
                      className={getPercentChangeColor(
                        token.attributes.market_data.changes.percent_1d
                      )}
                    >
                      {token.attributes.market_data.changes.percent_1d.toFixed(
                        2
                      )}
                      %
                    </span>
                  ) : (
                    "-"
                  ),
                ],
                [
                  "Market Cap",
                  token.attributes.market_data.market_cap
                    ? `$${token.attributes.market_data.market_cap.toLocaleString()}`
                    : "-",
                ],
                [
                  "Fully Diluted Valuation",
                  token.attributes.market_data.fully_diluted_valuation
                    ? `$${token.attributes.market_data.fully_diluted_valuation.toLocaleString()}`
                    : "-",
                ],
                [
                  "Circulating Supply",
                  token.attributes.market_data.circulating_supply
                    ? token.attributes.market_data.circulating_supply.toLocaleString()
                    : "-",
                ],
                [
                  "Total Supply",
                  token.attributes.market_data.total_supply
                    ? token.attributes.market_data.total_supply.toLocaleString()
                    : "-",
                ],
              ].map(([label, value], idx) => (
                <tr
                  key={idx}
                  className="border-b border-neutral-200 dark:border-neutral-700"
                >
                  <td className="p-2 font-semibold">{label}</td>
                  <td className="p-2">{value || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Blockchain Implementations */}
          {token.attributes.implementations.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold border-b border-neutral-200 dark:border-neutral-700 p-2">
                Blockchain Implementations
              </h3>
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="p-2 text-start">Chain</th>
                    <th className="p-2 text-start">Contract Address</th>
                  </tr>
                </thead>
                <tbody>
                  {token.attributes.implementations.map((impl, index) => (
                    <tr
                      key={index}
                      className="border-b border-neutral-200 dark:border-neutral-700"
                    >
                      <td className="p-2">{impl.chain_id}</td>
                      <td className="p-2 break-all">{impl.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* External Links */}
          {token.attributes.external_links.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold border-b border-neutral-200 dark:border-neutral-700 p-2">
                Social Links
              </h3>
              <div className="text-sm text-blue-600 flex flex-row flex-wrap gap-2 m-2">
                {token.attributes.external_links.map((link, index) => (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={index}
                    className="flex flex-row items-center gap-2"
                  >
                    <div className=" h-1 w-1 bg-blue-600 rounded-full" />
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TokenInfoTable;
