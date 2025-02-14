# CW1 dApp Project Overview
This project is a dApp for Pokémons NFT Trading. It has two contracts, and React as frontend


# Technical Overview
# Solidity
Both smart contracts use ^0.8.28 which will remain compatible with future versions of solidity (0.8.x).

# React


# Pinata
We use **Pinata** to store NFT images securely on **IPFS**, ensuring decentralized and tamper-proof storage. To prevent **CORS issues**, we utilize a **proxy server** that acts as an intermediary, allowing stable communication between our React frontend and the IPFS network via Pinata’s API.

# Use of GenAI
We have used GenAI to streamline our workflow, assisting with tasks like CSS editing, scripting, and implementing various functionalities, allowing us to work more efficiently and focus on core development, including contracts, core front-end functionalities and integration of components.

# Setup Guide
# Contract Deployment
# Step 1: Start Local Blockchain
First, navigate into the contract folder, install Hardhat locally and start a local blockchain using Hardhat:
```sh
cd contract
npm install --save-dev hardhat
npx hardhat node
```
This will launch a local blockchain at **http://127.0.0.1:8545/** and generate test accounts.
Do not close this terminal, as it will stop the local blockchain.

# Step 2: Save Account Information
- Copy and save the generated **accounts and private keys** for future reference.
- Copy the **first private key** and paste it inside `hardhat.config.ts` in the `accounts` section where indicated.
- The **first account** is the admin.

# Step 3: Deploy the Smart Contracts
To deploy the contracts to the local testnet, run the commands below in a **second terminal**:
```sh
npx hardhat run scripts/deploy.ts --network localhost
```
After successful deployment, you will see contract addresses similar to:

```
NFT_CONTRACT: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
TRADING_CONTRACT: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

# Step 4: Update Contract Addresses in Frontend
- Open `client`, create .env file and add the contract addresses like this, do not change variable name:

```
VITE_NFT_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_TRADING_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

- And add our Pinata JSON Web Token for later use (No need to change, just copy and paste):
- This JWT is for user, with only the ability to read but not write.

```
VITE_PINATA_JWT_USER=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIzMTdjMDVkZi0wMDIwLTRiMTUtOTM1NC00OThlMzYyZWNhMmUiLCJlbWFpbCI6IjA3MTVzdG9uZUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNTAxMGFmNGFmOGRhOWY4YzI4M2EiLCJzY29wZWRLZXlTZWNyZXQiOiIwODlkYWVmYmYzNWE0MGM2MzlkMzAxZTZmYTg0MTgwM2IzMTExYmE0MTAzZmU1NmEzMjA5OGRmOTZiYWMwZmE4IiwiZXhwIjoxNzcwMTM5MzQ5fQ.ZoS2lz-OBYyxps6BnTIWnaz3gMb-vSZggLlHelt5Cz4
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
- Network Name: GoChain Testnet
- New RPC URL: http://127.0.0.1:8545/
- Chain ID: 31337 (default for Hardhat)
- Currency Symbol: GO
- Block Explorer URL: (Leave blank)
Click "Save".
Now, MetaMask is connected to the local blockchain.

# Step 2: Import a Hardhat Test Account into MetaMask
Copy a private key from the Hardhat terminal (look for "Private Key" under one of the generated accounts).
In MetaMask, click your profile icon, then "Import Account".
Paste the private key and click "Import".
Now Your MetaMask wallet is now connected to the local blockchain with test ETH.

# Step 3: Continue setting up .env
In the .env file fron earlier, add the network configuration.
```
VITE_CHAIN_ID=0x7A69
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_ID_INTEGER=31337
```

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


# User Manual
Main page, you should login first via metamask before you can interect with the nfts.
There is a search bar in the header, allow you to pinpoint pokemon you like
There is a filter on the left, you will be ablve to filter the properties of the nfts to find the onw you liek



# Security Considerations

# PokemonNFT Security
# Reentrancy Attacks
Uses ReentrancyGuard for added security.

# Unauthorized Minting
Only owner can mint (onlyOwner).

# Invalid Pokémon Stats
Enforces max stat limit (≤ 100).

# Unauthorized Transfers
Uses ERC721 safe transfer functions.

# Pause Functionality
Owner can pause/unpause operations.

# TradingContractCW1 Security
# Reentrancy Attacks
Uses ReentrancyGuard to prevent reentrancy attacks in functions that handle NFT transfers and payments. Functions like placeBid(), buyCard(), and finalizeAuction() use nonReentrant to ensure that calls cannot be exploited recursively.

# Unauthorized Listings
Ensures that only the NFT owner can list an NFT for sale or auction using the onlyApprovedOwner modifier, which checks both ownership and approval status before allowing a listing.

# Invalid Pricing
Prevents zero-price listings by enforcing a minimum price check in listCard() and startAuction(). Ensures that a starting bid in auctions is not zero to prevent manipulation.

# Auction Front-Running
Implements minimum bid increments (MIN_INCREMENT) to prevent front-running in placeBid(). A new bid must be at least 5% higher than the previous highest bid, reducing chances of low-value front-running attacks.

# Unauthorized Transfers
NFTs are transferred to the contract when listed to prevent unauthorized transfers. This ensures that only the trading contract can execute sales, reducing risks of double spending or unauthorized withdrawals.

# Bid Refund Handling
Ensures safe refunding of previous bidders when a new bid is placed in placeBid(). Refunds are stored in pendingWithdrawals before being sent to avoid direct external calls that could introduce reentrancy risks.

# Pausability
The contract includes pause and unpause functions (pause() and unpause()) that allow the contract owner to halt all trading activities in case of an exploit or security breach.

# Backend

# PokemonNFT

# Main Functions
# Minting
Create a new Pokémon NFT with stats (HP, Attack, Defense, etc.).

# Metadata
Stores Pokémon stats using a struct (PokemonMetadata).

# Pausability
The owner can pause/unpause contract functions.

# Access Control
Only the contract owner can mint new Pokémon.

# Execution Flow
cardIdCounter: Tracks total NFTs minted (each new card gets a sequential ID).
PokemonType: Defines all possible Pokemon types (Normal, Fire, Water, etc).
mintCard():	Owner mints an NFT to a user.
_mint():	New NFT is assigned to the recipient.
_setTokenURI():	Stores metadata URI for the NFT.
pokemonData[tokenId]:	Saves Pokémon stats.
CardMinted event:	Logs the NFT creation on-chain.
getPokemonStats(tokenId):	Fetches Pokémon stats.

# TradingContractCW1

# Main Functions
# listCard(uint256 tokenId, uint256 price)
Lists an NFT for a fixed price sale. Ensures the caller is the NFT owner, transfers NFT to the contract, stores the listing, and emits an event.

# startAuction(uint256 tokenId, uint256 startingBid, uint256 duration)
Starts an auction for an NFT. Transfers NFT to the contract, sets the starting bid and auction duration, and emits an event.

# placeBid(uint256 tokenId)
Places a bid on an active auction. Ensures auction is active, verifies bid amount, refunds previous highest bidder, updates auction data, and emits an event.

# cancelFixedPriceListing(uint256 tokenId)
Cancels a fixed-price listing. Ensures the caller is the NFT owner, transfers NFT back, removes the listing, and emits an event.

# buyCard(uint256 tokenId)
Purchases an NFT from a fixed-price listing. Ensures the NFT is listed, verifies the payment amount, transfers NFT ownership, sends ETH to the seller, and emits an event.

# finalizeAuction(uint256 tokenId)
Finalizes an auction after it ends. Transfers NFT to the highest bidder, sends ETH to the seller, refunds previous bidders, and emits an event.

# pause()
(imported from openzeppelin Ownable) Pauses trading functions, only the owner can pause contract operations.

# unpause()
(imported from openzeppelin Ownable) Resumes trading functions, only the owner can unpause contract operations.

# Execution Flow
listNFT(tokenId, price):	Owner lists an NFT for sale.
approve(address(this), tokenId):	The owner approves the contract to transfer their NFT.
buyNFT(tokenId):	Buyer purchases the NFT by sending ETH.
safeTransferFrom(owner, buyer, tokenId):	NFT ownership is transferred to the buyer.
transfer(seller, msg.value):	ETH is transferred to the seller.
cancelListing(tokenId):	Owner removes the NFT from sale.

# Frontend
# Role Based UI Access
-Depending on the account you are accessing from, you will be able to see only the nfts that you are meant to see
-Action is also account based, you will only be able to list, cancel list, auction, finalize auction if you are the seller.

# Prevent Injection Attack
-In search bar, we santised the input to prevent injection attacks.
-The other filters only allows numbers.

# Strict Price input to prevent overflow
-Min price 0.001, Max price 10000.
