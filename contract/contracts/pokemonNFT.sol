// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721URIStorage, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title Decentralized Pokémon Card Trading Platform
/// @notice Implements an ERC721 token with trading functionality
contract PokemonCardCreation is ERC721URIStorage, ReentrancyGuard, Ownable, Pausable {
    uint256 public cardIdCounter;*9
    uint256 public listingFee;
    mapping(uint256 => Listing) public listings;

    struct Listing {
        uint256 cardId;
        address seller;
        uint256 price;
        bool isActive;
        uint256 expiryTime;
    }

    event CardMinted(address indexed owner, uint256 indexed cardId, string uri);
    event CardListed(uint256 indexed cardId, address indexed seller, uint256 price, uint256 expiryTime);
    event CardPurchased(uint256 indexed cardId, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed cardId, address indexed seller, uint256 refundAmount);
    event ListingFeeUpdated(uint256 newFee);
    event ContractPaused();
    event ContractUnpaused();
    event Received(address indexed sender, uint256 amount);
    event FallbackTriggered(address indexed sender, uint256 amount, bytes data);

    constructor(address initialOwner, uint256 _listingFee) ERC721("PokemonCard", "PKC") Ownable(initialOwner) {
        require(_listingFee > 0, "Listing fee must be greater than 0.");
        listingFee = _listingFee;
    }

    function mintCard(address to, string memory uri) external onlyOwner {
        unchecked {
            cardIdCounter++;
        }
        uint256 newCardId = cardIdCounter;
        _mint(to, newCardId);
        _setTokenURI(newCardId, uri);
        emit CardMinted(to, newCardId, uri);
    }

    function listCard(uint256 cardId, uint256 price, uint256 duration) external payable whenNotPaused nonReentrant {
        require(ownerOf(cardId) == msg.sender, "You are not the owner of this card.");
        require(price > 0, "Listing price must be greater than zero.");
        require(msg.value == listingFee, "Incorrect listing fee provided.");
        require(!listings[cardId].isActive, "This card is already listed. Remove current listing first.");

        listings[cardId] = Listing({
            cardId: cardId,
            seller: msg.sender,
            price: price,
            isActive: true,
            expiryTime: block.timestamp + duration
        });

        emit CardListed(cardId, msg.sender, price, listings[cardId].expiryTime);
    }

    function purchaseCard(uint256 cardId) external payable whenNotPaused nonReentrant {
        Listing memory listing = listings[cardId];
        require(listing.isActive, "This card is not listed for sale.");
        require(msg.value == listing.price, "Incorrect price sent.");
        require(block.timestamp <= listing.expiryTime, "This listing has expired.");

        (bool success, ) = listing.seller.call{value: msg.value}("");
        require(success, "Transfer failed.");

        _transfer(listing.seller, msg.sender, cardId);
        delete listings[cardId];
        emit CardPurchased(cardId, msg.sender, msg.value);
    }

    function cancelListing(uint256 cardId) external nonReentrant {
        Listing memory listing = listings[cardId];
        require(listing.isActive, "This card is not listed.");
        require(listing.seller == msg.sender, "You are not the seller of this card.");

        (bool success, ) = msg.sender.call{value: listingFee}("");
        require(success, "Refund failed.");

        delete listings[cardId];
        emit ListingCancelled(cardId, msg.sender, listingFee);
    }

    function removeExpiredListing(uint256 cardId) external onlyOwner {
        Listing memory listing = listings[cardId];
        require(listing.cardId != 0, "Listing does not exist.");
        require(listing.isActive, "Listing is already inactive.");
        require(block.timestamp > listing.expiryTime, "Listing has not yet expired.");
        delete listings[cardId];
        emit ListingCancelled(cardId, listing.seller, 0);
    }

    function updateListingFee(uint256 newFee) external onlyOwner {
        require(newFee > 0, "Listing fee must be greater than zero.");
        listingFee = newFee;
        emit ListingFeeUpdated(newFee);
    }

    function pause() external onlyOwner {
        _pause();
        emit ContractPaused();
    }

    function unpause() external onlyOwner {
        _unpause();
        emit ContractUnpaused();
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds available for withdrawal.");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed.");
    }

    fallback() external payable {
        emit FallbackTriggered(msg.sender, msg.value, msg.data);
        revert("Fallback function: Ether not accepted.");
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
        revert("Receive function: Ether not accepted.");
    }
}
