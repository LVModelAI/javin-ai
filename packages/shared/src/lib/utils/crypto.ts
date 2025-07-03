import crypto from "crypto";
import { marked } from "marked";
import { htmlToText } from "html-to-text";

export const sha256 = (data: string): string => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

export const stringToCanonicalText = async (
  markdown: string
): Promise<string> => {
  const html = await marked(markdown);
  const plainText = htmlToText(html);
  const canonicalText = plainText
    .replace(/\r\n/g, "\n") // Normalize line endings. Lets try but Is think we should replace it.
    .trim();
  console.log("Converted Markdown to Canonical Text");
  console.log("Canonical Text: ", canonicalText);
  return canonicalText;
};

export const pushOnchainReturnHash = async (content: string) => {
  const sanitizedString = await stringToCanonicalText(content);
  const hash = sha256(sanitizedString);

  //   PUSH ONCHAIN

  return hash;
};

export const verifyHashIntegrity = async (content: string) => {
  const sanitizedString = await stringToCanonicalText(content);

  const computedHash = sha256(sanitizedString);
  console.log("Computed hash:", computedHash);

  const tempHash =
    "f8747b0b1539a047e2fa4f21f4c3f45ba4bb5ecfec2d5f55277183f52187fdb8";
  console.log("Temp hash: ", tempHash);

  console.log("Are they same ?: ", computedHash == tempHash);

  // find the hash onchain
  // if hash found, return true
  // if not found, return false

  return computedHash === tempHash;
  // return true
};
