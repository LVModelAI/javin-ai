import { tool } from "ai";
import { z } from "zod";
import {
  SUPPORTED_CURRENCY,
  zerionBaseURL,
} from "@javin/shared/lib/utils/constants";
import { getZerionApiKey } from "@javin/shared/lib/utils/utils";
import { logInfo, logObjects } from "@javin/shared/lib/utils/logging";
import * as Sentry from "@sentry/nextjs";

// Zerion response types (minimal; only fields we actually use)
type ZerionIcon = { url?: string };

type ZerionQuantity = {
  int?: string;
  decimals?: number;
  float?: number;
  numeric?: string;
};

type ZerionImplementation = {
  chain_id?: string;
  address?: string;
  decimals?: number;
};

type ZerionFungibleInfo = {
  name?: string;
  symbol?: string;
  icon?: ZerionIcon;
  implementations?: ZerionImplementation[];
};

type ZerionApplicationMetadata = {
  name?: string;
  icon?: ZerionIcon;
  url?: string;
};

type ZerionPositionAttributes = {
  protocol?: string;
  protocol_module?: string;
  pool_address?: string | null;
  group_id?: string;
  name?: string;
  position_type?: string;
  quantity?: ZerionQuantity;
  value?: number;
  price?: number;
  changes?: { absolute_1d?: number; percent_1d?: number };
  fungible_info?: ZerionFungibleInfo;
  flags?: { displayable?: boolean; is_trash?: boolean };
  updated_at?: string;
  updated_at_block?: string | number | null;
  application_metadata?: ZerionApplicationMetadata;
};

type ZerionRelId = { type?: string; id?: string };

type ZerionPositionRelationships = {
  chain?: { data?: ZerionRelId | null };
  dapp?: { data?: ZerionRelId | null };
  fungible?: { data?: ZerionRelId | null };
};

type ZerionPosition = {
  type: string;
  id: string;
  attributes: ZerionPositionAttributes;
  relationships?: ZerionPositionRelationships;
};

type ZerionPositionsResponse = {
  links?: { self?: string };
  data: ZerionPosition[];
};

export type WalletPositionSummary = {
  id: string;
  currencySymbol?: string;
  chain_id?: string;
  protocol?: string;
  dapp_id?: string;
  position_type?: string;
  name?: string;
  symbol?: string;
  quantity?: number;
  value?: number;
  price?: number;
  changes?: { absolute_1d?: number; percent_1d?: number };
  pool_address?: string | null;
  token_address?: string;
  token_chain_id?: string;
  icon_url?: string;
  updated_at?: string;
  app?: { name?: string; icon_url?: string; url?: string };
};

export const getEvmWalletPositions = tool({
  description:
    "Fetch complex (staked, LP, etc.) fungible positions for an EVM wallet.",
  parameters: z.object({
    wallet_address: z
      .string()
      .min(1, "Wallet address is required")
      .describe("EVM wallet address (0x...)"),
    currency: z
      .enum(SUPPORTED_CURRENCY)
      .default("usd")
      .describe("Denominated currency value of returned prices"),
  }),
  execute: async ({
    wallet_address,
    currency = "usd",
  }: {
    wallet_address: string;
    currency: string;
  }): Promise<WalletPositionSummary[] | string> => {
    const apiKey = getZerionApiKey();
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${apiKey}`,
      },
    } as const;

    logInfo(
      "fetching positions using tool getEvmWalletPositions - " + wallet_address
    );

    try {
      const url = `${zerionBaseURL}/wallets/${wallet_address}/positions/?filter[positions]=only_complex&currency=${currency}&filter[trash]=only_non_trash&sort=value`;
      logInfo("url is " + url);

      const response = await fetch(url, options);
      const json: ZerionPositionsResponse = await response.json();

      if (!json || !Array.isArray(json.data)) {
        return "No results found. Check address and try again.";
      }

      if (json.data.length === 0) {
        return "No complex positions found for this wallet.";
      }
      // Remove trash positions and any positions valued at 1 USD or less
      const MIN_POSITION_VALUE = 1;

      /*
       "links": {
    "self": "https://api.zerion.io/v1/wallets/0x59387e6869a12d76f321ea609de4e073284f734f/positions/?currency=inr&filter%5Bchain_ids%5D=abstract%2Cape%2Carbitrum%2Caurora%2Cavalanche%2Cbase%2Cberachain%2Cbinance-smart-chain%2Cblast%2Ccelo%2Cdegen%2Cethereum%2Cfantom%2Cgravity-alpha%2Chyperevm%2Cink%2Ckatana%2Clens%2Clinea%2Cmantle%2Coptimism%2Cplasma%2Cpolygon-zkevm%2Cpolygon%2Cscroll%2Csomnia%2Csoneium%2Csonic%2Cunichain%2Cwonder%2Cworld%2Cxdai%2Cxinfin-xdc%2Czero%2Czkcandy%2Czksync-era%2Czora&filter%5Bpositions%5D=only_simple&filter%5Btrash%5D=only_non_trash&sort=value"
  },
  */

      // Extract currency from query params
      let currencySymbol: string | null = null;
      if (json.links?.self) {
        const url = new URL(json.links.self);
        currencySymbol = url.searchParams.get("currency");
      }

      console.log(currencySymbol); // "usd"

      const summaries: WalletPositionSummary[] = json.data
        .filter((p) => p?.attributes?.flags?.is_trash !== true)
        .filter((p) => (p?.attributes?.value ?? 0) > MIN_POSITION_VALUE)
        .map((p) => {
          const a = p.attributes || {};
          const r = p.relationships || {};
          const chainId = r.chain?.data?.id;
          const dappId = r.dapp?.data?.id;
          const impl = a.fungible_info?.implementations?.[0];
          const tokenAddress = impl?.address;
          const tokenChainId = impl?.chain_id;

          return {
            id: p.id,
            currencySymbol: currencySymbol,
            chain_id: chainId,
            protocol: a.protocol,
            dapp_id: dappId,
            position_type: a.position_type,
            name: a.name,
            symbol: a.fungible_info?.symbol,
            quantity: a.quantity?.float,
            value: a.value,
            price: a.price,
            changes: {
              absolute_1d: a.changes?.absolute_1d,
              percent_1d: a.changes?.percent_1d,
            },
            pool_address: a.pool_address ?? null,
            token_address: tokenAddress,
            token_chain_id: tokenChainId,
            icon_url: a.fungible_info?.icon?.url,
            updated_at: a.updated_at,
            app: {
              name: a.application_metadata?.name,
              icon_url: a.application_metadata?.icon?.url,
              url: a.application_metadata?.url,
            },
          } as WalletPositionSummary;
        });

      if (summaries.length === 0) {
        return "No complex positions above 1 USD found for this wallet.";
      }

      // logObjects(
      //   "positions summary from getEvmWalletPositions of wallet " +
      //     wallet_address,
      //   summaries
      // );

      return summaries;
    } catch (error) {
      console.error("Error fetching wallet positions:", error);
      Sentry.captureException(error);
      return "Failed to fetch wallet positions";
    }
  },
});
