import type {
  CoreAssistantMessage,
  CoreToolMessage,
  Message,
  TextStreamPart,
  ToolInvocation,
  ToolSet,
} from "ai";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Message as DBMessage, Document } from "@/lib/db/schema";
import { Globe, Network } from "lucide-react";
import { PortfolioData, TokenItem } from "@/types/wallet-actions-response";
import {
  BirdeyeTokenSearchResponse,
  TokenSearchData,
  TokenSearchResponse,
} from "@/types/token-search-response";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      "An error occurred while fetching the data."
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  return [];
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map((toolInvocation) => {
          const toolResult = toolMessage.content.find(
            (tool) => tool.toolCallId === toolInvocation.toolCallId
          );

          if (toolResult) {
            return {
              ...toolInvocation,
              state: "result",
              result: toolResult.result,
            };
          }

          return toolInvocation;
        }),
      };
    }

    return message;
  });
}

export function convertToUIMessages(
  messages: Array<DBMessage>
): Array<Message> {
  return messages.reduce((chatMessages: Array<Message>, message) => {
    if (message.role === "tool") {
      return addToolMessageToChat({
        toolMessage: message as CoreToolMessage,
        messages: chatMessages,
      });
    }

    let textContent = "";
    let reasoning: string | undefined = undefined;
    const toolInvocations: Array<ToolInvocation> = [];

    if (typeof message.content === "string") {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      for (const content of message.content) {
        if (content.type === "text") {
          textContent += content.text;
        } else if (content.type === "tool-call") {
          toolInvocations.push({
            state: "call",
            toolCallId: content.toolCallId,
            toolName: content.toolName,
            args: content.args,
          });
        } else if (content.type === "reasoning") {
          reasoning = content.reasoning;
        }
      }
    }

    chatMessages.push({
      id: message.id,
      role: message.role as Message["role"],
      content: textContent,
      reasoning,
      toolInvocations,
    });

    return chatMessages;
  }, []);
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function sanitizeResponseMessages({
  messages,
  reasoning,
}: {
  messages: Array<ResponseMessage>;
  reasoning: string | undefined;
}) {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === "tool") {
      for (const content of message.content) {
        if (content.type === "tool-result") {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== "assistant") return message;

    if (typeof message.content === "string") return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === "tool-call"
        ? toolResultIds.includes(content.toolCallId)
        : content.type === "text"
        ? content.text.length > 0
        : true
    );

    if (reasoning) {
      // @ts-expect-error: reasoning message parts in sdk is wip
      sanitizedContent.push({ type: "reasoning", reasoning });
    }

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0
  );
}

export function sanitizeUIMessages(messages: Array<Message>): Array<Message> {
  const messagesBySanitizedToolInvocations = messages.map((message) => {
    if (message.role !== "assistant") return message;

    if (!message.toolInvocations) return message;

    const toolResultIds: Array<string> = [];

    for (const toolInvocation of message.toolInvocations) {
      if (toolInvocation.state === "result") {
        toolResultIds.push(toolInvocation.toolCallId);
      }
    }

    const sanitizedToolInvocations = message.toolInvocations.filter(
      (toolInvocation) =>
        toolInvocation.state === "result" ||
        toolResultIds.includes(toolInvocation.toolCallId)
    );

    return {
      ...message,
      toolInvocations: sanitizedToolInvocations,
    };
  });

  return messagesBySanitizedToolInvocations.filter(
    (message) =>
      message.content.length > 0 ||
      (message.toolInvocations && message.toolInvocations.length > 0)
  );
}

export function getMostRecentUserMessage(messages: Array<Message>) {
  const userMessages = messages.filter((message) => message.role === "user");
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export type SearchGroupId =
  | "search"
  | "on_chain"
  | "creditcoin"
  | "vana"
  | "wormhole"
  | "flow";

export const searchGroups = [
  {
    id: "search" as const,
    name: "Web",
    description: "Search across the entire internet and blockchains",
    icon: Globe,
    img: "",
  },

  {
    id: "on_chain" as const,
    name: "On Chain",
    description: "Indepth onchain analysis",
    icon: Network,
    img: "",
  },
  // {
  //   id: "wormhole" as const,
  //   name: "Wormhole",
  //   description:
  //     "Access all the information you need to develop secure multichain applications powered by Wormhole",
  //   icon: Network,
  //   img: "/images/icon/wormhole-logo.png",
  // },

  {
    id: "creditcoin" as const,
    name: "Creditcoin",
    description: "Everything Creditcoin. Search, transactions and more.",
    icon: Network,
    img: "/images/icon/creditcoin/creditcoin-white.png",
  },
  {
    id: "vana" as const,
    name: "Vana",
    description: "Everything Vana. Search, transactions and more.",
    icon: Network,
    img: "/images/icon/vana/vana-icon-black.png",
  },
  {
    id: "flow" as const,
    name: "Flow",
    description: "Everything Flow. Search, transactions and more.",
    icon: Network,
    img: "/images/icon/flow-logo.png",
  },
] as const;

export type SearchGroup = (typeof searchGroups)[number];

export function shortenWalletAddresses(markdownText: string) {
  // Regex to match Ethereum-style addresses (both with and without code backticks)
  // Matches both `0x...` and 0x... patterns
  const walletRegex = /`?(0x[a-fA-F0-9]{40})`?/g;

  return markdownText.replace(walletRegex, (match, address) => {
    const cleanAddress = address || match;

    // Get first 6 and last 6 characters
    const start = cleanAddress.slice(0, 8); // includes '0x' plus 4 chars
    const end = cleanAddress.slice(-6);

    // If the match included backticks, preserve them
    if (match.startsWith("`")) {
      return `\`${start}...${end}\``;
    }

    return `${start}...${end}`;
  });
}

export const getZerionApiKey = () => {
  const apiKey = process.env.ZERION_DEV_API_KEY;
  const password = "";
  if (!apiKey) throw new Error("Api key not found");
  const encodedKey = btoa(`${apiKey}:${password}`);
  return encodedKey;
};

// transform birdeye portfolio to zerion portfolio
export const transformToZerionPortfolio = (apiResponse: any): PortfolioData => {
  const { wallet, totalUsd, items } = apiResponse.data;

  // Compute positions distribution by chain
  const positions_distribution_by_chain: { [key: string]: number } =
    items.reduce((acc: any, item: TokenItem) => {
      acc[item.symbol] = (acc[item.symbol] || 0) + item.valueUsd;
      return acc;
    }, {} as { [key: string]: number });

  // Define positions distribution by type (all funds assumed in wallet)
  const positions_distribution_by_type = {
    wallet: totalUsd,
    deposited: 0,
    borrowed: 0,
    locked: 0,
    staked: 0,
  };

  const total = {
    positions: totalUsd,
  };

  // Placeholder changes (would require historical data to compute actual values)
  const changes = {
    absolute_1d: 0, // Set to actual absolute change
    percent_1d: 0, // Set to actual percent change
  };

  return {
    type: "portfolio",
    id: wallet,
    attributes: {
      positions_distribution_by_type,
      positions_distribution_by_chain,
      total,
      changes,
    },
    currency: "usd",
  };
};

// fileter tokens with value less than 1 usd, and only top 20 tokens by value
export const filterAndLimitPortfolio = (
  portfolio: PortfolioData,
  valueThreshold: number = 1,
  limit: number = 10
): PortfolioData => {
  // Step 1: Filter out tokens with value < valueThreshold
  const filteredPositionsDistributionByChain = Object.fromEntries(
    Object.entries(portfolio.attributes.positions_distribution_by_chain).filter(
      ([_, value]) => value !== undefined && value >= valueThreshold
    )
  );

  // Step 2: Sort tokens by value and keep only the top `limit`
  const topPositionsDistributionByChain = Object.fromEntries(
    Object.entries(filteredPositionsDistributionByChain)
      .sort(([, valueA], [, valueB]) => (valueB ?? 0) - (valueA ?? 0)) // Sort descending
      .slice(0, limit) // Limit to top N
  );

  // Step 3: Recalculate total positions value after filtering and sorting
  const totalFilteredValue =
    Object.values(topPositionsDistributionByChain).reduce(
      (acc, value) => acc! + (value ?? 0),
      0
    ) || 0;

  return {
    ...portfolio,
    attributes: {
      ...portfolio.attributes,
      positions_distribution_by_chain: topPositionsDistributionByChain,
      total: {
        positions: totalFilteredValue,
      },
    },
  };
};

export const transformBirdeyeToTokenSearchResponse = (
  apiResponse: BirdeyeTokenSearchResponse
): TokenSearchResponse => {
  if (!apiResponse.success || !apiResponse.data) {
    throw new Error("Invalid Birdeye API response format");
  }

  const token = apiResponse.data;

  const transformedToken: TokenSearchData = {
    type: "fungibles",
    id: token.address,
    attributes: {
      name: token.name,
      symbol: token.symbol,
      description: token.extensions?.description || "",
      icon: {
        url: token.logoURI || "",
      },
      flags: {
        verified: false, // No verification info in API
      },
      external_links: [
        ...(token.extensions?.website
          ? [
              {
                type: "website",
                name: "Website",
                url: token.extensions.website,
              },
            ]
          : []),
        ...(token.extensions?.twitter
          ? [
              {
                type: "twitter",
                name: "Twitter",
                url: token.extensions.twitter,
              },
            ]
          : []),
      ],
      implementations: [
        {
          chain_id: "solana", // Assuming Solana (modify if necessary)
          address: token.address,
          decimals: token.decimals,
        },
      ],
      market_data: {
        total_supply: token.totalSupply ?? 0,
        circulating_supply: token.circulatingSupply ?? 0,
        market_cap: token.marketCap ?? 0,
        fully_diluted_valuation: token.fdv ?? 0,
        price: token.price ?? 0,
        changes: {
          percent_1d: token.priceChange24hPercent ?? 0,
          percent_30d: 0, // Not provided
          percent_90d: 0, // Not provided
          percent_365d: 0, // Not provided
        },
      },
    },
    relationships: {
      chart_day: {
        links: { related: "" },
        data: { type: "fungible_charts", id: `${token.address}-day` },
      },
      chart_hour: {
        links: { related: "" },
        data: { type: "fungible_charts", id: `${token.address}-hour` },
      },
      chart_max: {
        links: { related: "" },
        data: { type: "fungible_charts", id: `${token.address}-max` },
      },
      chart_month: {
        links: { related: "" },
        data: { type: "fungible_charts", id: `${token.address}-month` },
      },
      chart_week: {
        links: { related: "" },
        data: { type: "fungible_charts", id: `${token.address}-week` },
      },
      chart_year: {
        links: { related: "" },
        data: { type: "fungible_charts", id: `${token.address}-year` },
      },
    },
    links: {
      self: ``,
    },
  };

  return {
    links: {
      self: "",
    },
    data: [transformedToken],
  };
};

export const getPercentChangeColor = (percentChange: number) => {
  if (percentChange > 0) return "text-green-700";
  if (percentChange < 0) return "text-red-700";
  return "text-gray-400";
};

export const setWithExpiry = (key: string, value: string, ttl: number) => {
  const item = {
    value: value,
    expiry: new Date().getTime() + ttl,
  };
  localStorage.setItem(key, JSON.stringify(item));
};

export const getWithExpiry = (key: string) => {
  const itemStr = localStorage.getItem(key);

  // Return null if item doesn't exist
  if (!itemStr) return null;

  const item = JSON.parse(itemStr);
  const now = new Date().getTime();

  // Compare expiry time with current time
  if (now > item.expiry) {
    // Item has expired, remove it from localStorage
    localStorage.removeItem(key);
    return null;
  }

  return item.value;
};
