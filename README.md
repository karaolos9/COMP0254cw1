__COMP0254cw1__
__Pokémon Card Trading Platform (Decentralized Application)__

A decentralized application (dApp) built on Ethereum that enables users to mint, list, and trade Pokémon card NFTs using both fixed-price sales and auctions. The platform is powered by ERC721-compliant smart contracts and provides a secure and efficient marketplace for collectors and traders.

---

__Features__

__Smart Contracts__

1. __PokemonCardTrading.sol__:
   - Implements the ERC721 standard for Pokémon cards as NFTs.
   - Features include minting, listing, purchasing, and canceling sales.
   - Supports dynamic listing fees and expired listing management.

2. __TradingContract.sol__:
   - Extends trading functionality with auctions.
   - Enables fixed-price sales and bid-based auctions.
   - Secure refund mechanism for outbid auction participants.

 __Frontend__
- Web3-based user interface for interacting with smart contracts.
- Features include wallet integration, live marketplace updates, and auction management.
- Responsive design optimized for desktop and mobile devices.

 __Security__
- Reentrancy protection using OpenZeppelin's `ReentrancyGuard`.
- Event-driven architecture for transparency and traceability.
- Implements `Pausable` for emergency stops.

---

 __Getting Started__

__Prerequisites__
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Hardhat](https://hardhat.org/)
- [MetaMask](https://metamask.io/)
- [npm](https://www.npmjs.com/)

---

__Installation__

1. __Clone the Repository__:
   ```bash
   git clone https://github.com/your-repo/pokemon-card-trading.git
   cd pokemon-card-trading
