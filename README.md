# CW1 dApp Project Overview
This project is a decentralized application (dApp) for Pokémon NFT Trading. It enables users to trade Pokémon NFTs securely on a local blockchain. The platform integrates Solidity smart contracts for handling transactions, a React frontend, and MetaMask for wallet authentication. Images are stored securely using Pinata (IPFS) for decentralized file storage.

# Technical Overview
## Solidity
Both smart contracts use ^0.8.28 which will remain compatible with future versions of solidity (0.8.x).

## React
- React: ^18.3.1 – Frontend framework for building a dynamic UI.
- React DOM: ^18.3.1 – Handles rendering React components in the DOM.
- TypeScript: ~5.6.2 – Statically typed language for safer and more scalable development.
- Vite: ^6.0.5 – A fast and optimized build tool for React projects.

## Pinata
We use **Pinata** to store NFT images securely on **IPFS**, ensuring decentralized and tamper-proof storage. To prevent **CORS issues**, we utilize a **proxy server** that acts as an intermediary, allowing stable communication between our React frontend and the IPFS network via Pinata’s API.

## Metamask
MetaMask is a software cryptocurrency wallet used to interact with the Ethereum blockchain. It allows a user to access their Ethereum wallet through a browser extension or mobile app, which can then be used to interact with decentralized applications.

# Use of GenAI
We have used GenAI to streamline our workflow, assisting with tasks like CSS editing, scripting, and implementing various functionalities, allowing us to work more efficiently and focus on core development, including contracts, core front-end functionalities and integration of components.

# Setup Guide
## Contract Deployment
### Step 1: Start Local Blockchain
First, navigate into the contract folder, install Hardhat locally and start a local blockchain using Hardhat:
```sh
cd contract
npm install --save-dev hardhat
npx hardhat node
```
This will launch a local blockchain at **http://127.0.0.1:8545/** and generate test accounts.
Do not close this terminal, as it will stop the local blockchain.

### Step 2: Save Account Information
- Copy and save the generated **accounts and private keys** for future reference.
- Copy the **first private key** and paste it inside `hardhat.config.ts` in the `accounts` section where indicated.
- The **first account** is the admin.

### Step 3: Deploy the Smart Contracts
To deploy the contracts to the local testnet, run the commands below in a **second terminal**:
```sh
npx hardhat run scripts/deploy.ts --network localhost
```
After successful deployment, you will see contract addresses similar to:

```
NFT_CONTRACT: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
TRADING_CONTRACT: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

### Step 4: Update Contract Addresses in Frontend
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

## Minting NFTs (Pokémons)
To mint all Pokémon NFTs with the admin as the owner:

### Step 1: Update Minting Script
- Open `contracts/scripts/mint.ts`
- Paste the **NFT_CONTRACT address** into `NFT_CONTRACT_ADDRESS`
- Paste your **admin account address** into `RECIPIENT_ADDRESS`

### Step 2: Run Minting Script
Execute the minting script:
```sh
npx hardhat run scripts/mint.ts --network localhost
```

This will **mint all Pokémon NFTs** to the admin's wallet.

------------------

## MetaMask Setup
### Step 1: Add Hardhat Localhost to MetaMask
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

### Step 2: Import a Hardhat Test Account into MetaMask
Copy a private key from the Hardhat terminal (look for "Private Key" under one of the generated accounts).
In MetaMask, click your profile icon, then "Import Account".
Paste the private key and click "Import".
Now Your MetaMask wallet is now connected to the local blockchain with test ETH.

### Step 3: Continue setting up .env
In the .env file fron earlier, add the network configuration.
```
VITE_CHAIN_ID=0x7A69
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_ID_INTEGER=31337
```

------------------

## Webpage Deployment
To start the **frontend application**, follow these steps:

### Step 1: Install Dependencies
Navigate to the frontend (`client`) folder and install required dependencies:
```sh
cd client
npm install
```

### Step 2: Start Development Server
Run the frontend application locally:
```sh
npm run dev
```

The app should now be live at **http://localhost:5173/**.

---

# User Manual dApp

## 1. Main Page & Login  
Upon visiting the marketplace, you **must log in via MetaMask** before interacting with NFTs.  
To do this:  
1. Click the **"Connect"** button at the top.  
2. Sign the authentication request in MetaMask.  
3. Once connected, your wallet address and balance will appear in the **wallet button** once clicked again.  

---

## 2. Header Navigation
The top navigation bar contains:  
**Search Bar** – Allows you to search for specific NFTs (e.g., by Pokémon name).  
**Shopping Cart** – Stores NFTs you have added for purchase.  
**Wallet Button** – Displays your wallet address (used for login).  
**Profile Button/Home Button** – Shows NFTs you have collected once logged in. If in profile mode, click again leads back to market place.

---

## 3. Filtering NFTs 
On the **left side of the page**, you will find **filter options** to refine your search:  
**Sort NFTs** – By **price (Low → High, High → Low)**.  
**Filter by Properties** – Including:  
   - **Status** (All, Listed, Auction).  
   - **Owner** (All, My NFTs).  
   - **Price Range** (Min, Max).  
   - **Stats & Types** (Pokémon Stats & Types).  

---

## 4. Interacting with NFTs
NFTs are displayed in the **main section** of the page. You can interact with them using:  
- **"Add to Cart"** – If the NFT is listed for sale, add to shopping cart.  
- **"Buy Now"** – Instantly purchase the NFT by adding the nft and opening the shopping cart.  
- **"View Auction"** – If the NFT is in an auction, you can check the current bids and place yours.  

**Clicking on an NFT** opens a **detailed interface**, showing its **metadata, attributes, and available actions** based on its listing status.  

---

## 5. Managing Your NFTs (Profile Page)  
Click on the **Profile Button (Top Right)** to view your **collected NFTs**. Here, you can:  
**List NFTs** – Put your NFTs up for sale.  
**Cancel Listings** – Remove them from the marketplace.  
**Start an Auction** – Sell via auction.  
**Finalize Auction** – Complete the sale once the auction ends.

Other than listing, the rest of the actions can be done in non-profile mode as well.

---

## 6. Auction & Marketplace Controls
If **an auction is paused**, you **will NOT see any action buttons** for buying, bidding, or listing NFTs.  
This ensures **all marketplace activities are temporarily halted** when necessary.  

---

# Security Considerations

## PokemonNFT Security

- Reentrancy Attacks:
Uses ReentrancyGuard for added security.

- Unauthorized Minting:
Only owner can mint (onlyOwner).

- Invalid Pokémon Stats:
Enforces max stat limit (≤ 100).

- Unauthorized Transfers:
Uses ERC721 safe transfer functions.

- Pause Functionality:
Owner can pause/unpause operations.

## TradingContractCW1 Security
- Reentrancy Attacks:
Uses ReentrancyGuard to prevent reentrancy attacks in functions that handle NFT transfers and payments. Functions like placeBid(), buyCard(), and finalizeAuction() use nonReentrant to ensure that calls cannot be exploited recursively.

- Unauthorized Listings:
Ensures that only the NFT owner can list an NFT for sale or auction using the onlyApprovedOwner modifier, which checks both ownership and approval status before allowing a listing.

- Invalid Pricing:
Prevents zero-price listings by enforcing a minimum price check in listCard() and startAuction(). Ensures that a starting bid in auctions is not zero to prevent manipulation.

- Auction Front-Running:
Implements minimum bid increments (MIN_INCREMENT) to prevent front-running in placeBid(). A new bid must be at least 5% higher than the previous highest bid, reducing chances of low-value front-running attacks.

- Unauthorized Transfers:
NFTs are transferred to the contract when listed to prevent unauthorized transfers. This ensures that only the trading contract can execute sales, reducing risks of double spending or unauthorized withdrawals.

- Bid Refund Handling:
Ensures safe refunding of previous bidders when a new bid is placed in placeBid(). Refunds are stored in pendingWithdrawals before being sent to avoid direct external calls that could introduce reentrancy risks.

- Pausability:
The contract includes pause and unpause functions (pause() and unpause()) that allow the contract owner to halt all trading activities in case of an exploit or security breach.

## Frontend Security

- Role Based UI Access:
The interface dynamically adjusts based on the connected wallet, ensuring users only see NFTs relevant to their account. Actions such as listing, canceling a listing, initiating an auction, and finalizing an auction are restricted to the original seller, preventing unauthorized modifications.

- Injection Attack Prevention:
The search bar sanitizes user input to prevent injection attacks, ensuring safe and secure searches. Numeric filters are strictly enforced, allowing only numbers to maintain data integrity in the filter section.

- Strict Price Input to Prevent Overflow:
Price inputs are constrained within a safe range, with a minimum price of 0.001 ETH and a maximum price of 10,000 ETH to prevent value overflow.

- Emergency Stop:
A pause functionality is implemented at the contract level, allowing administrators to temporarily halt transactions in case of security threats or unforeseen issues.

# Backend Structure Overview

## PokemonNFT

### Main Functions
- Minting:
Create a new Pokémon NFT with stats (HP, Attack, Defense, etc.).

- Metadata:
Stores Pokémon stats using a struct (PokemonMetadata).

- Pausability:
The owner can pause/unpause contract functions.

- Access Control:
Only the contract owner can mint new Pokémon.

### Execution Flow:
- cardIdCounter: Tracks total NFTs minted (each new card gets a sequential ID).
- PokemonType: Defines all possible Pokemon types (Normal, Fire, Water, etc).
- mintCard():	Owner mints an NFT to a user.
- _mint():	New NFT is assigned to the recipient.
- _setTokenURI():	Stores metadata URI for the NFT.
- pokemonData[tokenId]:	Saves Pokémon stats.
- CardMinted event:	Logs the NFT creation on-chain.
- getPokemonStats(tokenId):	Fetches Pokémon stats.

## TradingContractCW1

### Main Functions
- listCard(uint256 tokenId, uint256 price):
Lists an NFT for a fixed price sale. Ensures the caller is the NFT owner, transfers NFT to the contract, stores the listing, and emits an event.

- startAuction(uint256 tokenId, uint256 startingBid, uint256 duration):
Starts an auction for an NFT. Transfers NFT to the contract, sets the starting bid and auction duration, and emits an event.

- placeBid(uint256 tokenId):
Places a bid on an active auction. Ensures auction is active, verifies bid amount, refunds previous highest bidder, updates auction data, and emits an event.

- cancelFixedPriceListing(uint256 tokenId):
Cancels a fixed-price listing. Ensures the caller is the NFT owner, transfers NFT back, removes the listing, and emits an event.

- buyCard(uint256 tokenId):
Purchases an NFT from a fixed-price listing. Ensures the NFT is listed, verifies the payment amount, transfers NFT ownership, sends ETH to the seller, and emits an event.

- finalizeAuction(uint256 tokenId):
Finalizes an auction after it ends. Transfers NFT to the highest bidder, sends ETH to the seller, refunds previous bidders, and emits an event.

- pause():
(imported from openzeppelin Ownable) Pauses trading functions, only the owner can pause contract operations.

- unpause():
(imported from openzeppelin Ownable) Resumes trading functions, only the owner can unpause contract operations.

### Execution Flow
- listNFT(tokenId, price):	Owner lists an NFT for sale.
- approve(address(this), tokenId):	The owner approves the contract to transfer their NFT.
- buyNFT(tokenId):	Buyer purchases the NFT by sending ETH.
- safeTransferFrom(owner, buyer, tokenId):	NFT ownership is transferred to the buyer.
- transfer(seller, msg.value):	ETH is transferred to the seller.
- cancelListing(tokenId):	Owner removes the NFT from sale.

# Frontend Structure Overview

---

## **Main Application Files**
- **`main.tsx`** – The entry point of the application that renders the root React component.  
- **`App.tsx`** – The main application component containing core logic and routing.  
- **`App.css`** – Main application styles.  
- **`index.css`** – Global CSS styles.  
- **`config.js`** – Configuration file containing environment variables and contract addresses.  

---

## **Core Directories**
### **API Integration (`/api/`)**
- **`pinataApi.ts`** – Handles interactions with the Pinata IPFS service for NFT metadata storage.  

### **Components (`/components/`)**
UI components for the application:  
- **`InlineProductDetails.tsx`** – Displays detailed product information inline. As well as handle cancel listing and bid placing.
- **`AuctionModal.tsx`** – Modal for auction-related actions.  
- **`ListingModal.tsx`** – Modal for listing NFTs for sale.  
- **`CartPanel.tsx`** – Shopping cart panel component.  
- **`SearchBar.tsx`** – Search functionality component.  
- **`Toast.tsx`** – Notification component.  
- **`PinataImage.tsx`** – Displays images from Pinata IPFS.  

### **Contract Integration (`/contracts/`)**
- **`abis.ts`** – Contains smart contract ABIs for interacting with NFT and Trading contracts.  

### **Context (`/context/`)**
Manages global state and shared application data:  
- **`CartContext.tsx`** – React context for managing shopping cart state across components.  

### **Blockchain & Web3 (`/services/`)**
- **`web3Service.ts`** – Handles Web3 interactions and blockchain connectivity.  

### **Types & Interfaces (`/types/`)**
- **`index.ts`** – TypeScript type definitions used throughout the application.  
- **`types.ts` (in root)** – Additional TypeScript interfaces and types.  

### **Assets & Styling**
- **`/assets/`** – Contains static assets (images, icons, etc.).  
- **`/styles/`** – Contains CSS/styling files for components.

# Contributions

## Michalis:
- Smart Contract Development
- Smart Contract Testing
- Smart Contract Deployment
- Frontend Deployment
- Smart Contract Integration
- Smart Contract Security
- Smart Contract Documentation
- Integration of components

## Stone:
- Frontend Development
- Frontend Testing
- Frontend Documentation
- Frontend Security
- Frontend Optimization
- Smart Contract Deployment
- Frontend Deployment
- Integration of components

During integration of components, we worked together to ensure the full understanding of the frontend and backend, ensure all components are working as intended.
