import { NFT_ABI, TRADING_ABI } from './contracts/abis';

export const CONTRACT_ADDRESSES = {
  NFT_CONTRACT: "0x9550C786877ECdfbEb4dE17b9644B5b47B1BF1aF",
  TRADING_CONTRACT: "0x6a8e1C4558F395E00A2dc0439A097B293355F546"
};

// Pinata configuration
export const PINATA_BASE_URL = 'https://api.pinata.cloud';

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