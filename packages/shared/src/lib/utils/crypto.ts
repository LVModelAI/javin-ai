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

// stateless helper functions
const plainTextToCanonicalText = (plainText: string): string =>
  plainText
    .replace(/\\n/g, "") // remove escaped newlines (e.g., \\n)
    .replace(/\s+/g, "") // remove all whitespace: spaces, tabs, newlines
    .trim(); // remove any leftover leading/trailing invisible characters

const markdownToCanonicalText = async (markdown: string): Promise<string> => {
  const decoded = markdown.replace(/\\n/g, "\n"); // decode escaped newlines
  const plainText = removeMd(decoded);
  const canonical = plainTextToCanonicalText(plainText);
  console.log("Canonical text:", canonical);
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
): Promise<void> {
  const info = await apiClient.v1.chain.get_info();
  // console.log("Chain info:", info);
  const abiRes = await apiClient.call({
    path: "/v1/chain/get_abi",
    params: { account_name: contractAccount },
  });

  const { abi } = abiRes as any;

  const untypedAction: AnyAction = {
    account: contractAccount,
    name: "addhash",
    authorization: [{ actor, permission: "active" }],
    data: { hash },
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

  await apiClient.call({
    path: "/v1/chain/push_transaction",
    params: packed,
  });
}

export async function checkHashOnChain(
  apiClient: APIClient,
  hash: string,
  contractAccount: string
): Promise<boolean> {
  const result: API.v1.GetTableRowsResponse = await apiClient.call({
    path: "/v1/chain/get_table_rows",
    params: {
      code: contractAccount,
      table: "hashmap",
      scope: contractAccount,
      json: true,
      limit: 1000,
    },
  });
  // console.log("hash table Result:", result);

  return result.rows.some((row: any) => row.hash === hash && row.exists);
}

export async function verifyHashIntegrity(
  apiClient: APIClient,
  content: string,
  contractAccount: string
): Promise<boolean> {
  console.log(
    "###########################################################################################"
  );
  const canonicalFromMarkdown = await markdownToCanonicalText(content);
  const hashFromMarkdown = sha256(canonicalFromMarkdown);
  console.log("Verifying hash from markdown:", hashFromMarkdown);

  return checkHashOnChain(apiClient, hashFromMarkdown, contractAccount);
}

export async function pushOnchainReturnHash(
  apiClient: APIClient,
  content: string,
  contractAccount: string,
  actor: string,
  privateKey: string
): Promise<string> {
  try {
  } catch (error) {}
  const canonical = await markdownToCanonicalText(content);
  const hash = sha256(canonical);
  console.log("Pushing hash to chain:", hash);
  await pushHashToChain(apiClient, hash, contractAccount, actor, privateKey);
  console.log("Hash pushed successfully:");
  return hash;
}
