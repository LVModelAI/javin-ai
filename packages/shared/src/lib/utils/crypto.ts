import crypto from "crypto";
import {
  API,
  APIClient,
  PrivateKey,
  SignedTransaction,
  Transaction,
  AnyAction,
  Action,
  PackedTransaction,
} from "@wireio/core";
import removeMd from "remove-markdown";

export interface WireTransactionResponse {
  query_time_ms: number;
  executed: boolean;
  trx_id: string;
  lib: number;
  cached_lib: boolean;
  actions: WireAction[];
  last_indexed_block: number;
  last_indexed_block_time: string;
}

export interface WireAction {
  action_ordinal: number;
  creator_action_ordinal: number;
  act: {
    account: string;
    name: string;
    authorization: {
      actor: string;
      permission: string;
    }[];
    data: {
      hash: string;
      [key: string]: any;
    };
  };
  "@timestamp": string;
  block_num: number;
  block_id: string;
  producer: string;
  trx_id: string;
  global_sequence: number;
  cpu_usage_us: number;
  net_usage_words: number;
  signatures: string[];
  code_sequence: number;
  abi_sequence: number;
  act_digest: string;
  receipts: {
    receiver: string;
    global_sequence: string;
    recv_sequence: string;
    auth_sequence: {
      account: string;
      sequence: string;
    }[];
  }[];
  timestamp: string;
}

type TxnData = {
  transaction_id: string;
  processed: {
    id: string;
    block_num: number;
    block_time: string;
    receipt: {
      status: string;
      cpu_usage_us: number;
      net_usage_words: number;
    };
    elapsed: number;
    net_usage: number;
    scheduled: boolean;
    action_traces: [
      {
        action_ordinal: number;
        receipt: {
          receiver: string;
        };
        act: {
          account: string;
          name: string;
          authorization: any[]; // Assuming this is an array
          data: { input: string }; // Assuming input is a string
          hex_data: string;
        };
        console: string;
        return_value_data?: {
          exists: 0 | 1;
        };
        return_value_hex_data?: string;
      }
    ];
  };
};

// stateless helper functions
export const plainTextToCanonicalText = (plainText: string): string =>
  plainText
    .replace(/\\n/g, "") // remove escaped newlines (e.g., \\n)
    .replace(/\s+/g, "") // remove all whitespace: spaces, tabs, newlines
    .trim(); // remove any leftover leading/trailing invisible characters

export const markdownToCanonicalText = async (
  markdown: string
): Promise<string> => {
  const decoded = markdown.replace(/\\n/g, "\n"); // decode escaped newlines
  const plainText = removeMd(decoded);
  const canonical = plainTextToCanonicalText(plainText);
  // console.log("Canonical text:", canonical);
  return canonical;
};

export const sha256 = (data: string): string =>
  crypto.createHash("sha256").update(data).digest("hex");

// core logic that now accepts `apiClient` and config
export async function pushHashToChain(
  apiClient: APIClient,
  hash: string,
  contractAccount: string,
  actor: string,
  privateKey: string
): Promise<{ transaction_id: string; input: string }> {
  async function buildPackAndPush() {
    const info = await apiClient.v1.chain.get_info();

    // pick a recent block for TAPOS
    const taposBlockNum =
      Math.max(1, (info.head_block_num as any as number) - 3);

    const block = await apiClient.call({
      path: "/v1/chain/get_block",
      params: { block_num_or_id: taposBlockNum },
    }) as any;

    // make expiration a little in the future
    const headTime = new Date((info.head_block_time as any as string) + "Z").getTime();
    const expiration = new Date(headTime + 120 * 1000) // 120 sec
      .toISOString()
      .replace("Z", ""); // nodeos expects no trailing Z

    // fetch ABI and build the typed action
    const { abi } = (await apiClient.call({
      path: "/v1/chain/get_abi",
      params: { account_name: contractAccount },
    })) as any;

    const untypedAction: AnyAction = {
      account: contractAccount,
      name: "addhash",
      authorization: [{ actor, permission: "active" }],
      data: { input: hash },
    };
    const action = Action.from(untypedAction, abi);

    // assemble the transaction with explicit TAPOS
    const trx = Transaction.from({
      expiration,
      ref_block_num: (block.block_num as number) & 0xffff,
      ref_block_prefix: block.ref_block_prefix as number,
      max_net_usage_words: 0,
      max_cpu_usage_ms: 0,
      delay_sec: 0,
      context_free_actions: [],
      actions: [action],
      transaction_extensions: [],
    });

    // sign for this exact chain_id
    const digest = trx.signingDigest(info.chain_id as any as string);
    const privKey = PrivateKey.from(privateKey);
    const signature = privKey.signDigest(digest).toString();
    const signedTrx = SignedTransaction.from({ ...trx, signatures: [signature] });
    const packed = PackedTransaction.fromSigned(signedTrx);

    const txnData: TxnData = await apiClient.call({
      path: "/v1/chain/push_transaction",
      params: packed,
    });

    const inputData = txnData.processed.action_traces[0].act.data;
    return { transaction_id: txnData.transaction_id, input: inputData.input };
  }

  // try once, and if reference block error occurs, refresh TAPOS and try again
  try {
    return await buildPackAndPush();
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes("invalid_ref_block_exception")) {
      // small backoff, rebuild TAPOS, push again
      await new Promise(r => setTimeout(r, 250));
      return await buildPackAndPush();
    }
    throw e;
  }
}


export async function pushOnchainReturnTxnId(
  apiClient: APIClient,
  content: string,
  contractAccount: string,
  actor: string,
  privateKey: string
): Promise<{
  transaction_id: string;
  input: string;
}> {
  try {
  } catch (error) {}
  const canonical = await markdownToCanonicalText(content);
  const hash = sha256(canonical);
  const txnData = await pushHashToChain(
    apiClient,
    hash,
    contractAccount,
    actor,
    privateKey
  );
  console.log("Hash pushed successfully:", txnData);
  return txnData;
}

export async function verifyHashIntegrity(
  hash: string,
  txnId: string
): Promise<boolean> {
  console.log("Verifying hash integrity for transaction ID:", txnId);

  try {
    console.log("Fetching transaction data for ID:", txnId);
    const res = await fetch(
      `https://testnet-hyperion.wire.foundation/v2/history/get_transaction?id=${txnId}`
    );
    if (!res.ok) {
      console.error("Failed to fetch transaction:", res.statusText);
      return false;
    }

    const data: WireTransactionResponse = await res.json();
    if (!data.executed || !data.actions || data.actions.length === 0) {
      console.error("Transaction not executed or missing actions.");
      return false;
    }

    console.log("Transaction data:", data.actions[0].act);
    const hashInTxn = data.actions[0].act.data.input;
    console.log("Hash in transaction:", hashInTxn);
    if (hashInTxn == hash) {
      console.log("✅ Hash verified on-chain.");
      return true;
    } else {
      console.warn("❌ Hash does not match.");
      return false;
    }
  } catch (err) {
    console.error("Error verifying hash:", err);
    return false;
  }
}
