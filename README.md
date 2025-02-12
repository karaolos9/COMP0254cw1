# CW1 dApp Project
This project is a dApp for Pokémons NFT Trading. It has two contracts, and React as frontend

# Use of GenAI
We have used GenAI to streamline our workflow, assisting with tasks like CSS editing, scripting, and implementing various functionalities, allowing us to work more efficiently and focus on core development, including contracts, core front-end functionalities and integration of components.

# Setup Guide
# Contract Deployment
# Step 1: Start Local Blockchain
First, navigate into the contract folder and start a local blockchain using Hardhat:
```sh
cd contract
npx hardhat node
```
This will launch a local blockchain at **http://127.0.0.1:8545/** and generate test accounts.

# Step 2: Save Account Information
- Copy and save the generated **accounts and private keys** for future reference.
- Copy the **first private key** and paste it inside `hardhat.config.ts` in the `accounts` section where indicated.

# Step 3: Deploy the Smart Contracts
To deploy the contracts to the local testnet, run:
```sh
npx hardhat run scripts/deploy.ts --network localhost
```
After successful deployment, you will see contract addresses similar to:

```
NFT_CONTRACT: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
TRADING_CONTRACT: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

# Step 4: Update Contract Addresses in Frontend
- Open `client/src/config.js`
- Paste the contract addresses under **CONTRACT_ADDRESSES** like this:

```javascript
export const CONTRACT_ADDRESSES = {
  NFT_CONTRACT: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  TRADING_CONTRACT: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
};
```

------------------

# Minting NFTs (Pokémons)
To mint all Pokémon NFTs with the admin as the owner:

# Step 1: Update Minting Script
- Open `contracts/scripts/mint.ts`
- Paste the **NFT_CONTRACT address** into `NFT_CONTRACT_ADDRESS`
- Paste your **admin account address** into `RECIPIENT_ADDRESS`

# Step 2: Run Minting Script
Execute the minting script:
```sh
npx hardhat run scripts/mint.ts --network localhost
```

This will **mint all Pokémon NFTs** to the admin's wallet.

------------------

# MetaMask Setup
# Step 1: Add Hardhat Localhost to MetaMask
- Download and open MetaMask on your browser.
- Click on the network selector (top left, usually says "Ethereum Mainnet").
- Click "Add Network", then "Add a Network Manually".
Fill in the details:
- Network Name: Hardhat Localhost
- New RPC URL: http://127.0.0.1:8545/
- Chain ID: 31337 (default for Hardhat)
- Currency Symbol: ETH
- Block Explorer URL: (Leave blank)
Click "Save".
Now, MetaMask is connected to the local Hardhat blockchain.

# Step 2: Import a Hardhat Test Account into MetaMask
Copy a private key from the Hardhat terminal (look for "Private Key" under one of the generated accounts).
In MetaMask, click your profile icon, then "Import Account".
Paste the private key and click "Import".
Now Your MetaMask wallet is now connected to the local blockchain with test ETH.

------------------

# Webpage Deployment
To start the **frontend application**, follow these steps:

# Step 1: Install Dependencies
Navigate to the frontend (`client`) folder and install required dependencies:
```sh
cd client
npm install
```

# Step 2: Start Development Server
Run the frontend application locally:
```sh
npm run dev
```

The app should now be live at **http://localhost:5173/**.