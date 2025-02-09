// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PokemonCardTrading
 * @notice A decentralized marketplace for trading Pokémon cards via fixed-price sales and auctions.
 * @dev This contract handles listing, bidding, finalizing auctions, and withdrawal patterns.
 */
contract PokemonCardTrading is ReentrancyGuard, Pausable, Ownable {
    using Address for address payable;

    // Custom Errors
    error InvalidPrice();
    error NotOwner();
    error NotApproved();
    error InactiveListing();
    error AuctionHasEnded();
    error AuctionNotEnded();
    error Unauthorized();
    error NothingToWithdraw();
    error InvalidNFT();
    error DurationTooLong();
    error AuctionDurationZero();
    error NotAnAuction();
    error UseAuctionFunctions();
    error InsufficientPayment();
    error LowBid();
    error NFT_AlreadyListed();

    // Structs
    struct Listing {
        address seller;
        uint256 price;
        bool isAuction;
        bool isActive;
    }

    struct Auction {
        uint256 askingPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
    }

    // Constants 
    uint256 public constant MAX_DURATION = 30 days;
    uint256 public constant MIN_INCREMENT = 5; // Used to prevent front running attacks

    // State Variables
    address public immutable nftContract;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Auction) public auctions;
    mapping(address => uint256) private pendingWithdrawals;

    // Events

    /**
     * @dev Emitted when a card is listed for sale or auction.
     */
    event CardListed(uint256 indexed tokenId, address seller, uint256 price, bool isAuction);

    /**
     * @dev Emitted when a fixed-price sale is completed.
     */
    event SaleCompleted(uint256 indexed tokenId, address buyer, uint256 price);

    /**
     * @dev Emitted when a bid is placed in an auction.
     */
    event AuctionBid(uint256 indexed tokenId, address bidder, uint256 amount);

    /**
     * @dev Emitted when an auction is finalized.
     */
    event AuctionEnded(uint256 indexed tokenId, address winner, uint256 amount);

    /**
     * @dev Emitted when a user withdraws funds.
     */
    event Withdrawal(address indexed user, uint256 amount);

    // Modifiers

    /**
     * @dev Checks that the caller is the owner of the token and has approved the contract.
     * @param tokenId The identifier of the token.
     */
    modifier onlyApprovedOwner(uint256 tokenId) {
        if (IERC721(nftContract).ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (
            !IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) &&
            IERC721(nftContract).getApproved(tokenId) != address(this)
        ) revert NotApproved();
        _;
}

    // Constructor

    /**
     * @notice Initializes the contract with the NFT contract address.
     * @param _nftContract The address of the ERC721 NFT contract.
     */
    constructor(address _nftContract) Ownable(msg.sender) {
        if (_nftContract == address(0)) revert InvalidNFT();
        nftContract = _nftContract;
    }

    // External Functions

    /**
     * @notice Lists a Pokémon card for a fixed-price sale.
     * @param tokenId The token identifier of the Pokémon card.
     * @param price The sale price in wei.
     */
    function listCard(uint256 tokenId, uint256 price) external whenNotPaused nonReentrant{
        if (listings[tokenId].isActive) revert NFT_AlreadyListed();

        if (IERC721(nftContract).ownerOf(tokenId) != msg.sender) revert NotOwner(); 
        //Custom error: NotOwner() is useful for testing purposes (e.g repeated listings attacks) but instead of this, one could include onlyApprovedOwner(tokenId) in the function
        
        if (
            !IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) &&
            IERC721(nftContract).getApproved(tokenId) != address(this)
        ) revert NotApproved();
        if (price == 0) revert InvalidPrice();

        // Transfer NFT from seller to this contract
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            isAuction: false,
            isActive: true
        });

        emit CardListed(tokenId, msg.sender, price, false);
    }


    /**
     * @notice Starts an auction for a Pokémon card.
     * @param tokenId The token identifier of the Pokémon card.
     * @param startingBid The minimum starting bid in wei.
     * @param duration The duration of the auction in seconds (max 30 days).
     */
    function startAuction(uint256 tokenId, uint256 startingBid, uint256 duration)
        external
        whenNotPaused
        nonReentrant
        onlyApprovedOwner(tokenId)
    {
        if (duration == 0) revert AuctionDurationZero();
        if (startingBid == 0) revert InvalidPrice();
        if (duration > MAX_DURATION) revert DurationTooLong();

        // Transfer NFT from seller to this contract
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: 0,
            isAuction: true,
            isActive: true
        });

        auctions[tokenId] = Auction({
            askingPrice: startingBid,
            highestBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + duration
        });

        emit CardListed(tokenId, msg.sender, startingBid, true);
    }

    /**
     * @notice Places a bid on an active auction.
     * @param tokenId The token identifier of the Pokémon card.
     */
    function placeBid(uint256 tokenId)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        Listing storage listing = listings[tokenId];
        Auction storage auction = auctions[tokenId];

        if (!listing.isActive) revert InactiveListing();
        if (listing.isAuction && block.timestamp >= auction.endTime) revert AuctionHasEnded();
        if (auction.highestBid == 0) {
            if (msg.value < auction.askingPrice)  revert LowBid();
        } else {
            uint256 minBid = auction.highestBid * (100 + MIN_INCREMENT) / 100;
            if (msg.value < minBid) revert LowBid();
        }

        // Refund the previous highest bidder if necessary
        if (auction.highestBidder != address(0)) {
            pendingWithdrawals[auction.highestBidder] += auction.highestBid;
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit AuctionBid(tokenId, msg.sender, msg.value);
    }

    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        if (listing.seller != msg.sender) revert Unauthorized();
        if (listing.isAuction) revert UseAuctionFunctions();
        if (!listing.isActive) revert InactiveListing();
        if (IERC721(nftContract).ownerOf(tokenId) != address(this)) revert InvalidNFT();
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        delete listings[tokenId];
    }

    /**
     * @notice Buys a Pokémon card listed for fixed-price sale.
     * @param tokenId The token identifier of the Pokémon card.
     */
    function buyCard(uint256 tokenId)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        Listing storage listing = listings[tokenId];
        if (!listing.isActive) revert InactiveListing();
        if (listing.isAuction) revert UseAuctionFunctions();
        if (msg.value < listing.price) revert InsufficientPayment();
        require(IERC721(nftContract).ownerOf(tokenId) == address(this), "Contract doesn't own the NFT");

        listing.isActive = false;

        // Refund excess funds if sent
        if (msg.value > listing.price) {
            Address.sendValue(payable(msg.sender), msg.value - listing.price);
        }
        
        // Transfer NFT to buyer
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        // Transfer sale proceeds to the seller
        Address.sendValue(payable(listing.seller), listing.price);

        emit SaleCompleted(tokenId, msg.sender, listing.price);
    }

    /**
     * @notice Finalizes an auction, transferring the NFT and funds appropriately.
     * @param tokenId The token identifier of the Pokémon card.
     */
    function finalizeAuction(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        Auction storage auction = auctions[tokenId];

        if (!listing.isActive) revert InactiveListing();
        if (!listing.isAuction) revert NotAnAuction();
        if (block.timestamp < auction.endTime) revert AuctionNotEnded();
        if (msg.sender != listing.seller && msg.sender != owner()) revert Unauthorized();

        listing.isActive = false;

        if (auction.highestBidder != address(0)) {
            require(IERC721(nftContract).ownerOf(tokenId) == address(this), "Contract must own the NFT to finalize auction");
            // Auction successful: transfer NFT to highest bidder and funds to seller
            IERC721(nftContract).safeTransferFrom(address(this), auction.highestBidder, tokenId);
            Address.sendValue(payable(listing.seller), auction.highestBid);
            emit AuctionEnded(tokenId, auction.highestBidder, auction.highestBid);
        } else {
            // No bids: return NFT to seller
            IERC721(nftContract).safeTransferFrom(address(this), listing.seller, tokenId);
            emit AuctionEnded(tokenId, address(0), 0);
        }
        delete auctions[tokenId];
        delete listings[tokenId];
    }

    /**
     * @notice Withdraws funds available from overbid refunds.
     */
    function withdrawFunds() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingWithdrawals[msg.sender] = 0;
        Address.sendValue(payable(msg.sender), amount);

        emit Withdrawal(msg.sender, amount);
    }

    // Admin Functions

    /**
     * @notice Pauses the trading functions.
     * @dev Callable only by the contract owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the trading functions.
     * @dev Callable only by the contract owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}