// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * Import from OpenZeppelin:
 *  ERC721: Standard interface for non-fungible tokens
 *  ERC721URIStorage: Extension that supports URI storage for each token
 *  ReentrancyGuard: Helps prevent re-entrant calls
 *  Ownable: Adds an owner with specific privileges
 *  Pausable: Allows pausing or unpausing the contract
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
contract PokemonCardCreation is ERC721URIStorage, ReentrancyGuard, Ownable, Pausable {

    /*
     * We keep track of how many cards have been minted.
     * Each newly minted card receives a new sequential ID.
     * cardIdCounter starts at 0, so the first card will be ID 1.
     */
    uint256 public cardIdCounter;
    enum PokemonType {
    NORMAL, FIRE, WATER, ELECTRIC, GRASS, ICE, 
    FIGHTING, POISON, GROUND, FLYING, PSYCHIC, BUG, 
    ROCK, GHOST, DRAGON, DARK, STEEL, FAIRY, LIGHT
    }

    struct PokemonMetadata {
        uint8 hp;
        uint8 attack;
        uint8 defense;
        uint8 speed;
        uint8 special;
        PokemonType pokemonType;
    }

    // mapp pokemonCardId to pokemonMetadata
    mapping(uint256 => PokemonMetadata) public pokemonData;

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
        cardIdCounter = 0;
    }

    /**
     * @notice Mint a new Pokémon card with metadata.
     * @param to The address that will receive the new card.
     * @param uri The metadata URI for this card.
     * @param hp Pokémon's HP (max 100).
     * @param attack Pokémon's Attack (max 100).
     * @param defense Pokémon's Defense (max 100).
     * @param speed Pokémon's Speed (max 100).
     * @param special Pokémon's Special stat (max 100).
     * @param pokemonType Pokémon's type (e.g. "Fire", "Water").
     */
    function mintCard(
        address to,
        string memory uri,
        uint8 hp,
        uint8 attack,
        uint8 defense,
        uint8 speed,
        uint8 special,
        PokemonType pokemonType
        ) external onlyOwner whenNotPaused  {
        require( 100 >= hp && 100>= attack && 100 >= defense && 100 >= speed && 100 >= special, "PokemonCardCreation: Stats must be between 0 and 100");

        // Increment our counter to get a unique card ID
        cardIdCounter ++;


        // Mint the NFT to the specified address
        _mint(to, cardIdCounter);

        // Emit an event so external observers know a new card was minted
        emit CardMinted(to, cardIdCounter, uri);

        // Associate the new card with its metadata URI
        _setTokenURI(cardIdCounter, uri);

        pokemonData[cardIdCounter] = PokemonMetadata(hp, attack, defense, speed, special, pokemonType);

    }

    /**
     * @notice Retrieve Pokémon stats.
     * @param tokenId The ID of the Pokémon card.
     * @return PokemonMetadata
     */
    function getPokemonStats(uint256 tokenId) 
        external 
        view 
        returns (PokemonMetadata memory) 
    {
        return pokemonData[tokenId];
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