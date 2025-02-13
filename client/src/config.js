import { NFT_ABI, TRADING_ABI } from './contracts/abis';

export const CONTRACT_ADDRESSES = {
  NFT_CONTRACT: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  TRADING_CONTRACT: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
};

// Pinata configuration
export const PINATA_BASE_URL = 'https://api.pinata.cloud';

// Network configuration for local Hardhat network
export const NETWORK_CONFIG = {
  chainId: "0x7A69", // 31337 in hex
  chainName: "Hardhat Local",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrls: []
};

// Contract ABIs
export const CONTRACT_ABIS = {
  NFT_CONTRACT: NFT_ABI,
  TRADING_CONTRACT: TRADING_ABI
};

// Environment check
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Chain ID in decimal for easy comparison
export const SUPPORTED_CHAIN_ID = 31337; // Hardhat's chain ID 