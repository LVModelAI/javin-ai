export const etherscanBaseURL = "https://api.etherscan.io/v2/api";
export const zerionBaseURL = "https://api.zerion.io";
export const chains = [42161, 8453, 10];

// Mapping from chainId to Blockscout base URLs
export const chainIdToBlockscoutUrl: Record<number, string> = {
  1: "https://eth.blockscout.com", // Ethereum Mainnet
  11155111: "https://sepolia.blockscout.com", // Sepolia Testnet
  17000: "https://holesky.blockscout.com", // Holesky Testnet
  42161: "https://arbitrum.blockscout.com", // Arbitrum One Mainnet
  42170: "https://arbitrum-nova.blockscout.com", // Arbitrum Nova Mainnet
  421614: "https://sepolia-arbitrum.blockscout.com", // Arbitrum Sepolia Testnet
  43114: "https://avalanche.blockscout.com", // Avalanche C-Chain
  43113: "https://avalanche-fuji.blockscout.com", // Avalanche Fuji Testnet
  8453: "https://base.blockscout.com", // Base Mainnet
  84532: "https://base-sepolia.blockscout.com", // Base Sepolia Testnet
  10: "https://optimism.blockscout.com", // OP Mainnet
  11155420: "https://optimism-sepolia.blockscout.com", // OP Sepolia Testnet
  56: "https://bsc.blockscout.com", // BNB Smart Chain Mainnet
  97: "https://bsc-testnet.blockscout.com", // BNB Smart Chain Testnet
  137: "https://polygon.blockscout.com", // Polygon Mainnet
  80002: "https://polygon-amoy.blockscout.com", // Polygon Amoy Testnet
  100: "https://gnosis.blockscout.com", // Gnosis
  42220: "https://celo.blockscout.com", // Celo Mainnet
  44787: "https://celo-alfajores.blockscout.com", // Celo Alfajores Testnet
  59144: "https://linea.blockscout.com", // Linea Mainnet
  59141: "https://linea-sepolia.blockscout.com", // Linea Sepolia Testnet
  5000: "https://mantle.blockscout.com", // Mantle Mainnet
  5003: "https://mantle-sepolia.blockscout.com", // Mantle Sepolia Testnet
  534352: "https://scroll.blockscout.com", // Scroll Mainnet
  534351: "https://scroll-sepolia.blockscout.com", // Scroll Sepolia Testnet
  324: "https://zksync.blockscout.com", // zkSync Mainnet
  300: "https://zksync-sepolia.blockscout.com", // zkSync Sepolia Testnet
  1101: "https://polygon-zkevm.blockscout.com", // Polygon zkEVM Mainnet
  2442: "https://polygon-zkevm-cardona.blockscout.com", // Polygon zkEVM Cardona Testnet
  81457: "https://blast.blockscout.com", // Blast Mainnet
  168587773: "https://blast-sepolia.blockscout.com", // Blast Sepolia Testnet
  1284: "https://moonbeam.blockscout.com", // Moonbeam Mainnet
  1285: "https://moonriver.blockscout.com", // Moonriver Mainnet
  1287: "https://moonbase-alpha.blockscout.com", // Moonbase Alpha Testnet
  80094: "https://berachain.blockscout.com", // Berachain Mainnet
  80069: "https://berachain-bepolia.blockscout.com", // Berachain Bepolia Testnet
  252: "https://fraxtal.blockscout.com", // Fraxtal Mainnet
  2522: "https://fraxtal-testnet.blockscout.com", // Fraxtal Testnet
  167000: "https://taiko.blockscout.com", // Taiko Mainnet
  167009: "https://taiko-hekla.blockscout.com", // Taiko Hekla L2 Testnet
  660279: "https://xai.blockscout.com", // Xai Mainnet
  37714555429: "https://xai-sepolia.blockscout.com", // Xai Sepolia Testnet
};

export const supportedChainsAndId: Record<string, number> = {
  ethereumMainnet: 1,
  sepoliaTestnet: 11155111,
  holeskyTestnet: 17000,
  abstractMainnet: 2741,
  abstractSepoliaTestnet: 11124,
  apeChainCurtisTestnet: 33111,
  apeChainMainnet: 33139,
  arbitrumNovaMainnet: 42170,
  arbitrumOneMainnet: 42161,
  arbitrumSepoliaTestnet: 421614,
  avalancheCChain: 43114,
  avalancheFujiTestnet: 43113,
  baseMainnet: 8453,
  baseSepoliaTestnet: 84532,
  berachainMainnet: 80094,
  berachainBepoliaTestnet: 80069,
  bitTorrentChainMainnet: 199,
  bitTorrentChainTestnet: 1028,
  blastMainnet: 81457,
  blastSepoliaTestnet: 168587773,
  bnbSmartChainMainnet: 56,
  bnbSmartChainTestnet: 97,
  celoAlfajoresTestnet: 44787,
  celoMainnet: 42220,
  cronosMainnet: 25,
  fraxtalMainnet: 252,
  fraxtalTestnet: 2522,
  gnosis: 100,
  lineaMainnet: 59144,
  lineaSepoliaTestnet: 59141,
  mantleMainnet: 5000,
  mantleSepoliaTestnet: 5003,
  memecoreMainnet: 4352,
  memecoreTestnet: 43521,
  moonbaseAlphaTestnet: 1287,
  moonbeamMainnet: 1284,
  moonriverMainnet: 1285,
  opMainnet: 10,
  opSepoliaTestnet: 11155420,
  polygonAmoyTestnet: 80002,
  polygonMainnet: 137,
  polygonZkEvmCardonaTestnet: 2442,
  polygonZkEvmMainnet: 1101,
  scrollMainnet: 534352,
  scrollSepoliaTestnet: 534351,
  sonicBlazeTestnet: 57054,
  sonicMainnet: 146,
  sophonMainnet: 50104,
  sophonSepoliaTestnet: 531050104,
  swellchainMainnet: 1923,
  swellchainTestnet: 1924,
  taikoHeklaL2Testnet: 167009,
  taikoMainnet: 167000,
  unichainMainnet: 130,
  unichainSepoliaTestnet: 1301,
  wemixMainnet: 1111,
  wemixTestnet: 1112,
  worldMainnet: 480,
  worldSepoliaTestnet: 4801,
  xaiMainnet: 660279,
  xaiSepoliaTestnet: 37714555429,
  xdcApothemTestnet: 51,
  xdcMainnet: 50,
  zkSyncMainnet: 324,
  zkSyncSepoliaTestnet: 300,
};
