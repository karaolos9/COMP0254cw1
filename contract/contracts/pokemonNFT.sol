// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * We import from OpenZeppelin:
 * - ERC721: Standard interface for non-fungible tokens
 * - ERC721URIStorage: Extension that supports URI storage for each token
 * - ReentrancyGuard: Helps prevent re-entrant calls
 * - Ownable: Adds an owner with specific privileges
 * - Pausable: Allows pausing or unpausing the contract
 */
import { ERC721URIStorage, ERC721 } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PokemonCardCreation
 * @notice A minimal ERC721 contract for minting Pokemon cards with metadata.
 * @dev All trading logic is moved to a separate Trading contract.
 */
contract pokemonNFT is ERC721URIStorage, ReentrancyGuard, Ownable, Pausable {

    /*
     * We keep track of how many cards have been minted.
     * Each newly minted card receives a new sequential ID.
     * cardIdCounter starts at 0, so the first card will be ID 1.
     */
    uint256 public cardIdCounter;

    /**
     * @dev Emitted when a new card is minted.
     * @param owner The address that owns the newly minted card
     * @param cardId The identifier of the new card
     * @param uri The metadata URI for this card
     */
    event CardMinted(address indexed owner, uint256 indexed cardId, string uri);

    /**
     * @notice Sets up the contract by naming the tokens and designating an initial owner.
     * @param initialOwner The address that will be the contract's owner
     */
    constructor(address initialOwner)
        ERC721("PokemonCard", "PKC")
        Ownable(initialOwner)
    {
        // No extra setup required here
    }

    /**
     * @notice Mint a new Pokemon card to the given address.
     * @param to The address that will receive the new card
     * @param uri The metadata URI that describes this card (image, attributes, etc)
     *
     * Requirements:
     * - Only the contract owner can mint new cards
     * - The contract must not be paused
     */
    function mintCard(address to, string memory uri)
        external
        onlyOwner
        whenNotPaused
    {
        // Increment our counter to get a unique card ID
        cardIdCounter += 1;

        // Mint the NFT to the specified address
        _mint(to, cardIdCounter);

        // Associate the new card with its metadata URI
        _setTokenURI(cardIdCounter, uri);

        // Emit an event so external observers know a new card was minted
        emit CardMinted(to, cardIdCounter, uri);
    }

    /**
     * @notice Pause minting and other contract operations that use "whenNotPaused".
     * @dev Only the contract owner can pause the contract.
     */
    function pause()
        external
        onlyOwner
    {
        _pause();
    }

    /**
     * @notice Resume contract operations after a pause.
     * @dev Only the contract owner can unpause the contract.
     */
    function unpause()
        external
        onlyOwner
    {
        _unpause();
    }

    /**
     * @dev The fallback function reverts. We are not designed to accept Ether here.
     */
    fallback()
        external
        payable
    {
        revert("Fallback: Ether not accepted");
    }

    /**
     * @dev The receive function also reverts any Ether transfers.
     */
    receive()
        external
        payable
    {
        revert("Receive: Ether not accepted");
    }
}