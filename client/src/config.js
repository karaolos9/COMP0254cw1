import { NFT_ABI, TRADING_ABI } from './contracts/abis';

export const CONTRACT_ADDRESSES = {
  NFT_CONTRACT: import.meta.env.VITE_NFT_CONTRACT_ADDRESS,
  TRADING_CONTRACT: import.meta.env.VITE_TRADING_CONTRACT_ADDRESS,
};

export const PINATA_BASE_URL = import.meta.env.VITE_PINATA_BASE_URL;

export const NETWORK_CONFIG = {
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID, 10),
  rpcUrls: [import.meta.env.VITE_RPC_URL],
  chainName: "Hardhat Local",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18
  },
};

// Contract ABIs
export const CONTRACT_ABIS = {
  NFT_CONTRACT: NFT_ABI,
  TRADING_CONTRACT: TRADING_ABI
};

// Environment check
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Chain ID in decimal for easy comparison
export const SUPPORTED_CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID_INTEGER, 10); // Hardhat's chain ID 