import crypto from "crypto";
import { marked } from "marked";
import { htmlToText } from "html-to-text";
import {
  API,
  APIClient,
  FetchProvider,
  PrivateKey,
  SignedTransaction,
  Transaction,
  AnyAction,
  Action,
  PackedTransaction,
} from "@wireio/core";

const endpoint = "http://localhost:8888";
const contractAccount = "contract3fa5";
const actor = "contract3fa5";

const apiClient = new APIClient({ provider: new FetchProvider(endpoint) });

const stripToImportantCharacters = (input: string): string => {
  console.log("🔍 Stripping to important characters...");
  console.log("🔍 Input Content:", input);
  const decoded = input.replace(/\\n/g, "\n"); // Convert escaped newlines to real ones
  const a = decoded
    .replace(/\s+/g, "") // Remove all spaces, newlines, tabs
    .replace(/[^\p{L}\p{N}]/gu, ""); // Remove all non-letter, non-digit (including punctuation). letters, emojis and digits are retained.
  console.log("🔍 Stripped Content:", a);
  return a;
};

const plainTextToCanonicalText = (plainText: string): string => {
  console.log("📄 Converting Plaintext to Canonical...");
  // console.log("📄 Plain Text Content:", plainText);
  const canonicalText = plainText.replace(/\r\n/g, "\n").trim();
  // console.log("📄 Canonical Text:", canonicalText);
  return canonicalText;
};

const markdownToCanonicalText = async (markdown: string): Promise<string> => {
  console.log("📄 Converting Markdown to HTML...");
  // console.log("📄 Markdown Content:", markdown);
  const decoded = markdown.replace(/\\n/g, "\n"); // Convert escaped newlines to real ones
  const html = await marked(decoded);
  // console.log("📄 HTML Content:", html);
  const plainText = htmlToText(html);
  const canonicalText = plainTextToCanonicalText(plainText);
  return canonicalText;
};

export const sha256 = (data: string): string => {
  const result = crypto.createHash("sha256").update(data).digest("hex");
  console.log("🔑 SHA256 Hash:", result);
  return result;
};

export async function pushHashToChain(hash: string): Promise<void> {
  console.log("🚀 Pushing hash onchain:", hash);
  const info = await apiClient.v1.chain.get_info();
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

  console.log("✅ Hash added to blockchain.");
}

export async function checkHashOnChain(hash: string): Promise<boolean> {
  // console.log("🔍 Checking hash via table:", hash);

  const key = String(hash); // Use same hash key derivation logic
  const result: API.v1.GetTableRowsResponse = await apiClient.call({
    path: "/v1/chain/get_table_rows",
    params: {
      code: contractAccount,
      table: "hashmap",
      scope: contractAccount,
      json: true,
      limit: 1000, // or more if needed
    },
  });
  console.log("\nHash Map Table:\n", JSON.stringify(result.rows, null, 2));

  const match = result.rows.find((row: any) => row.hash === hash && row.exists);
  const found = !!match;
  if (found) console.log("✅ Hash found onchain:");
  else console.log("❌ Hash not found onchain:");
  return found;
  // const tmp =
  //   "dc5119d13d0ad787cc2eeec7a264ca80e753a7d1f60a117019e2b3f94f3ab6b2";
  // return tmp == hash;
}

async function readHashTable() {
  const tableResult: API.v1.GetTableRowsResponse = await apiClient.call({
    path: "/v1/chain/get_table_rows",
    params: {
      code: contractAccount,
      table: "hashmap",
      scope: contractAccount,
      json: true,
    },
  });

  console.log("\nHash Map Table:\n", JSON.stringify(tableResult.rows, null, 2));
}

export const pushOnchainReturnHash = async (
  content: string
): Promise<string> => {
  const canonical = await markdownToCanonicalText(content);
  const hash = sha256(canonical);
  await pushHashToChain(hash);
  return hash;
};

export const verifyHashIntegrity = async (
  content: string
): Promise<boolean> => {
  console.log("reading hash table...");
  const canonical = await markdownToCanonicalText(content);
  const hash = sha256(canonical);
  // console.log("verifying hash onchain:", hash);
  return await checkHashOnChain(hash);
};
