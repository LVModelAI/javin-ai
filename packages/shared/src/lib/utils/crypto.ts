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

export type CheckHashTxResult = {
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
          name: string;
          data: {
            input: string;
          };
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
): Promise<{
  transaction_id: string;
  input: string;
}> {
  console.log("Pushing hash to chain:", hash);
  const info = await apiClient.v1.chain.get_info();
  // console.log("Chain info:", info);
  const abiRes = await apiClient.call({
    path: "/v1/chain/get_abi",
    params: { account_name: contractAccount },
  });

  const { abi } = abiRes as any;
  // console.log("Contract ABI:", abi);
  const untypedAction: AnyAction = {
    account: contractAccount,
    name: "addhash",
    authorization: [{ actor, permission: "active" }],
    data: { input: hash }, // ✅ match the ABI — input, not hash
  };

  const action = Action.from(untypedAction, abi);
  const trx = Transaction.from({
    ...info.getTransactionHeader(),
    actions: [action],
  });

  const digest = trx.signingDigest(info.chain_id);
  const privKey = PrivateKey.from(privateKey);
  const signature = privKey.signDigest(digest).toString();

  const signedTrx = SignedTransaction.from({ ...trx, signatures: [signature] });
  const packed = PackedTransaction.fromSigned(signedTrx);

  const txnData: TxnData = await apiClient.call({
    path: "/v1/chain/push_transaction",
    params: packed,
  });
  const inputData = txnData.processed.action_traces[0].act.data;
  const txnId = txnData.transaction_id;
  console.log(
    "Transaction ",
    txnId,
    " pushed successfully with input data---",
    inputData
  );
  return {
    transaction_id: txnId,
    input: inputData.input, // return the input data for verification
  };
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
  apiClient: APIClient,
  contractAccount: string,
  actor: string,
  private_key: string,
  txnId: string
): Promise<boolean> {
  console.log("Verifying hash integrity for transaction ID:", txnId);
  return true; // TODO: Implement actual verification logic
}
