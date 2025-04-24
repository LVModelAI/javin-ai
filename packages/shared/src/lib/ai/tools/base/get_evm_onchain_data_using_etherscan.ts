import { getToolWhichGetsDataFromEtherscanByChain } from "../onchain/get_evm_onchain_data_using_etherscan";

// ETHERSCAN API SUPPORTS BASE AS A CHAIN AS IT IS ALSO EVM BASED.
// JUST NEED TO ADD chainid=8453 IN THE API URL
export const getBaseOnchainDataUsingBasescan =
  getToolWhichGetsDataFromEtherscanByChain(
    8453,
    "Get real-time data from Base chain."
  );
