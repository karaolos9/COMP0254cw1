//SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

// Import the ERC721 interface to interact with NFTs
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract PokemonCardTrading {
    // A struct to hold the details of a fixed-price sale or auction
    struct Listing {
        address seller;  // Address of the person selling the card
        uint256 price;   // Price in wei (0 means it's being auctioned)
        bool isAuction;  // Is this an auction? true = auction, false = fixed-price sale
        bool isActive;   // Is this listing currently active?
    }

    // A struct to hold details of an ongoing auction
    struct Auction {
        uint256 highestBid;      // Current highest bid amount in wei
        address highestBidder;   // Address of the highest bidder
        uint256 endTime;         // When the auction ends (timestamp)
    }

    address public nftContract; // The address of the NFT contract (PokemonCardNFT)
    mapping(uint256 => Listing) public listings; // Maps token IDs to their listings
    mapping(uint256 => Auction) public auctions; // Maps token IDs to their auction details
    mapping(address => uint256) private pendingWithdrawals; // Refund storage for outbid auction participants

    // Events to notify when key actions happen
    event CardListed(uint256 indexed tokenId, address seller, uint256 price, bool isAuction);
    event SaleCompleted(uint256 indexed tokenId, address buyer, uint256 price);
    event AuctionBid(uint256 indexed tokenId, address bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address winner, uint256 amount);

    // Constructor sets the address of the NFT contract when this contract is deployed
    constructor(address _nftContract) {
        nftContract = _nftContract; // Store the NFT contract address
    }

    // Function to list a card for sale at a fixed price
    function listCard(uint256 tokenId, uint256 price) external {
        // Transfer the NFT from the seller to this contract (this holds the NFT until it's sold)
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        // Create a new listing for the card
        listings[tokenId] = Listing(msg.sender, price, false, true);

        // Emit an event to notify the world that the card is listed
        emit CardListed(tokenId, msg.sender, price, false);
    }

    // Function to buy a card listed at a fixed price
    function buyCard(uint256 tokenId) external payable {
        Listing storage listing = listings[tokenId]; // Get the listing for this card
        require(listing.isActive, "Card not listed"); // Make sure the card is listed for sale
        require(!listing.isAuction, "Card is in auction"); // Make sure it's not an auction
        require(msg.value >= listing.price, "Insufficient payment"); // Ensure the buyer sent enough ETH

        listing.isActive = false; // Mark the listing as inactive before proceeding (security)

        // Transfer payment to the seller
        payable(listing.seller).transfer(listing.price);

        // Transfer the NFT to the buyer
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        // Emit an event for the completed sale
        emit SaleCompleted(tokenId, msg.sender, listing.price);
    }

    // Function to start an auction for a card
    function startAuction(uint256 tokenId, uint256 startingBid, uint256 duration) external {
        // Transfer the NFT from the seller to this contract for safekeeping
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        // Set up a listing for the auction
        listings[tokenId] = Listing(msg.sender, 0, true, true);

        // Set up the auction details (starting bid and end time)
        auctions[tokenId] = Auction(startingBid, address(0), block.timestamp + duration);

        // Emit an event to notify about the auction
        emit CardListed(tokenId, msg.sender, 0, true);
    }

    // Function for bidders to place a bid in an auction
    function placeBid(uint256 tokenId) external payable {
        Listing storage listing = listings[tokenId]; // Get the listing
        Auction storage auction = auctions[tokenId]; // Get the auction details

        require(listing.isActive, "Card not listed"); // Make sure the listing is active
        require(listing.isAuction, "Not an auction"); // Make sure this is an auction
        require(block.timestamp < auction.endTime, "Auction ended"); // Check that the auction is still running
        require(msg.value > auction.highestBid, "Bid too low"); // Ensure the new bid is higher than the current one

        // Refund the previous highest bidder
        if (auction.highestBid > 0) {
            pendingWithdrawals[auction.highestBidder] += auction.highestBid;
        }

        // Update the auction with the new highest bid and bidder
        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        // Emit an event to record the new bid
        emit AuctionBid(tokenId, msg.sender, msg.value);
    }

    // Function to end an auction
    function endAuction(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];
        Auction storage auction = auctions[tokenId];

        require(listing.isAuction, "Not an auction"); // Ensure this is an auction
        require(block.timestamp >= auction.endTime, "Auction not ended"); // Check if the auction has ended

        listing.isActive = false; // Mark the listing as inactive

        if (auction.highestBid > 0) {
            // Transfer the NFT to the winner
            IERC721(nftContract).transferFrom(address(this), auction.highestBidder, tokenId);

            // Transfer the auction proceeds to the seller
            payable(listing.seller).transfer(auction.highestBid);

            // Emit an event for the auction ending
            emit AuctionEnded(tokenId, auction.highestBidder, auction.highestBid);
        } else {
            // If no bids, return the NFT to the seller
            IERC721(nftContract).transferFrom(address(this), listing.seller, tokenId);
        }
    }

    // Function for bidders to withdraw their refunds from auctions
    function withdrawFunds() external {
        uint256 amount = pendingWithdrawals[msg.sender]; // Check the amount owed
        require(amount > 0, "No funds to withdraw"); // Ensure there are funds to withdraw

        pendingWithdrawals[msg.sender] = 0; // Reset the balance to zero (security)

        payable(msg.sender).transfer(amount); // Transfer the funds
    }
}