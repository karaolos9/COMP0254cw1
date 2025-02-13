import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import "./scripts/burnToken";

dotenv.config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!SEPOLIA_RPC_URL || !PRIVATE_KEY) {
  throw new Error("Please set your SEPOLIA_RPC_URL and PRIVATE_KEY in a .env file");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      chainId: 11155111
    },
    hardhat: {}, // Local Hardhat Network
    localhost: {
      url: "http://127.0.0.1:8545/",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" // Paste here
      ]
    }
  },
  gasReporter: {
    enabled: true,
    currency: "USD"
  }
};

export default config;
