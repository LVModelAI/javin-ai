// Import viem transport, viem chain, and ENSjs
import { http } from "viem";
import { mainnet } from "viem/chains";
import { createEnsPublicClient } from "@ensdomains/ensjs";


// import { ethers } from "ethers";
// const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com/");

// Create the client
const client = createEnsPublicClient({
  chain: mainnet,
  transport: http(),
});

// Use the client
export const multichainEnsLookup = async (name: string) => {
  const lowerCaseEnsName = name.toLowerCase();
  console.log("ens name:, ", lowerCaseEnsName);
  const ethAddress = await client.getAddressRecord({ name: lowerCaseEnsName });
  if (!ethAddress) {
    return "not found";
  }
  return ethAddress.value;
};

// export const polygonPnsLookup = async (name: string) => {
//   try {
//     const lowerCasePnsName = name.toLowerCase();
//     const address = await provider.resolveName(lowerCasePnsName);
//     console.log(`The primary address for ${lowerCasePnsName} is ${address}`);
//   } catch (error) {
//     console.error("Error resolving domain:", error);
//   }
// };

// // Create the client
// const clientPolygon = createEnsPublicClient({
//   // @ts-ignore
//   chain: polygon,
//   transport: http(),
// });

// export const polygonPnsLookup = async (name: string) => {
//   const lowerCasePnsName = name.toLowerCase();
//   console.log("ens name:, ", lowerCasePnsName);
//   const polAddress = await clientPolygon.getAddressRecord({ name: lowerCasePnsName });
//   if (!polAddress) {
//     return "not found";
//   }
//   return polAddress.value;
// };
