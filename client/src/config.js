import { NFT_ABI, TRADING_ABI } from './contracts/abis';

export const CONTRACT_ADDRESSES = {
  NFT_CONTRACT: "0xC252E988c7dE8a2BFbf6cE0a1A92FECE5A74C4D1",
  TRADING_CONTRACT: "0xD04E7654B270cec62377610643bbB0FB8a93FcB9"
};

// Network configuration for Sepolia
export const NETWORK_CONFIG = {
  chainId: "0xaa36a7", // Sepolia chain ID in hex
  chainName: "Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: ["https://eth-sepolia.g.alchemy.com/v2/8XyigRnoVSZULHhAxlOfXLfcEcNUZ36P"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"]
};

// Contract ABIs - you'll need to import these from your contract artifacts
export const CONTRACT_ABIS = {
  NFT_CONTRACT: NFT_ABI,
  TRADING_CONTRACT: TRADING_ABI
};

// Optional: Add environment check
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Optional: Add useful constants
export const SUPPORTED_CHAIN_ID = 11155111; // Sepolia chain ID in decimal 