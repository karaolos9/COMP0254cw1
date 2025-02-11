import { ethers } from "hardhat";
import axios from "axios";
import { PINATA_CONFIG } from "../config/pinata";
import { pokemonList, PokemonMintData } from "../data/pokemon-data";

// Replace with your actual deployed contract address
const NFT_CONTRACT_ADDRESS = "0x9550C786877ECdfbEb4dE17b9644B5b47B1BF1aF";

// Your wallet address that will receive the minted NFTs
const RECIPIENT_ADDRESS = "0x0E0a1b75212295c1d975C9fcFF27AFEd74579666";

// Keep track of minted IPFS hashes
const mintedHashes = new Set<string>();

async function isAlreadyMinted(pokemon: PokemonMintData, pokemonNFT: any): Promise<boolean> {
    try {
        const totalTokens = await pokemonNFT.cardIdCounter();
        
        // Check each existing token
        for (let tokenId = 1; tokenId <= totalTokens; tokenId++) {
            try {
                const uri = await pokemonNFT.tokenURI(tokenId);
                const cleanUri = uri.replace('ipfs://', '');
                
                if (cleanUri === pokemon.ipfsHash) {
                    console.log(`\n⚠️ Pokemon with IPFS hash ${pokemon.ipfsHash} already minted as Token ID: ${tokenId}`);
                    return true;
                }
            } catch (error) {
                // Skip if token doesn't exist or other error
                continue;
            }
        }
        return false;
    } catch (error) {
        console.error("Error checking minted status:", error);
        return false;
    }
}

async function verifyPinataMetadata(pokemon: PokemonMintData) {
    try {
        const response = await axios.get(`${PINATA_CONFIG.GATEWAY}/${pokemon.ipfsHash}`, {
            headers: {
                'Authorization': `Bearer ${PINATA_CONFIG.JWT}`
            }
        });

        // Only log relevant metadata information
        const metadata = response.data;
        console.log(`\nMetadata verified for ${pokemon.name}:`);
        console.log('Name:', metadata.name);
        console.log('Description:', metadata.description);
        console.log('Type:', metadata.keyvalues?.Type);
        return true;
    } catch (error) {
        console.error(`\nError verifying metadata for ${pokemon.name}`);
        if (axios.isAxiosError(error)) {
            console.error("Status:", error.response?.status);
            console.error("Message:", error.response?.data?.message || error.message);
        }
        return false;
    }
}

async function mintPokemon(pokemon: PokemonMintData, pokemonNFT: any) {
    // Check if already minted in current session
    if (mintedHashes.has(pokemon.ipfsHash)) {
        console.log(`\n⚠️ Skipping ${pokemon.name} - Already minted in this session`);
        return false;
    }

    // Check if already minted on blockchain
    if (await isAlreadyMinted(pokemon, pokemonNFT)) {
        console.log(`Skipping mint operation.`);
        return false;
    }

    console.log(`\n🎮 Minting ${pokemon.name}...`);
    console.log(`📦 IPFS Hash: ${pokemon.ipfsHash}`);
    console.log("📊 Stats:");
    console.log("  HP:", pokemon.stats.hp);
    console.log("  Attack:", pokemon.stats.attack);
    console.log("  Defense:", pokemon.stats.defense);
    console.log("  Speed:", pokemon.stats.speed);
    console.log("  Special:", pokemon.stats.special);
    console.log("  Type:", pokemon.stats.pokemonType);

    try {
        // Create IPFS URI
        const uri = `ipfs://${pokemon.ipfsHash}`;

        // Verify metadata exists on Pinata
        const isMetadataValid = await verifyPinataMetadata(pokemon);
        if (!isMetadataValid) {
            throw new Error(`Invalid metadata for ${pokemon.name}`);
        }

        console.log("\n💫 Sending transaction...");
        // Mint the NFT
        const tx = await pokemonNFT.mintCard(
            RECIPIENT_ADDRESS,
            uri,
            pokemon.stats.hp,
            pokemon.stats.attack,
            pokemon.stats.defense,
            pokemon.stats.speed,
            pokemon.stats.special,
            pokemon.stats.pokemonType
        );
        
        console.log("📝 Transaction hash:", tx.hash);
        console.log("⏳ Waiting for confirmation...");
        await tx.wait();

        // Get the minted token ID
        const tokenId = await pokemonNFT.cardIdCounter();
        
        console.log("\n✅ Pokemon Minted Successfully!");
        console.log("🎯 Token ID:", tokenId.toString());
        console.log(`🔍 View on Sepolia Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
        console.log(`🖼️ View Metadata: ${PINATA_CONFIG.GATEWAY}/${pokemon.ipfsHash}`);

        // Add to minted hashes set
        mintedHashes.add(pokemon.ipfsHash);

        return true;
    } catch (error) {
        console.error(`\n❌ Error minting ${pokemon.name}:`, error);
        return false;
    }
}

async function main() {
    // Get deployed contract
    const pokemonNFT = await ethers.getContractAt(
        "PokemonCardCreation", 
        NFT_CONTRACT_ADDRESS
    );
    
    console.log(`\n🚀 Starting batch mint process for ${pokemonList.length} Pokemon...`);
    console.log("📫 Recipient address:", RECIPIENT_ADDRESS);

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    // Mint each Pokemon in the list
    for (const pokemon of pokemonList) {
        const success = await mintPokemon(pokemon, pokemonNFT);
        if (success) {
            successCount++;
        } else if (await isAlreadyMinted(pokemon, pokemonNFT)) {
            skippedCount++;
        } else {
            failureCount++;
        }
        
        // Add a small delay between mints to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("\n📊 Batch Minting Summary:");
    console.log(`✅ Successfully minted: ${successCount}`);
    console.log(`⏭️ Skipped (already minted): ${skippedCount}`);
    console.log(`❌ Failed to mint: ${failureCount}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 