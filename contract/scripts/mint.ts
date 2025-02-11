import { ethers } from "hardhat";
import axios from "axios";
import { PINATA_CONFIG } from "../config/pinata";

// Replace with your actual deployed contract address
const NFT_CONTRACT_ADDRESS = "0x9550C786877ECdfbEb4dE17b9644B5b47B1BF1aF";

async function getPinataMetadata(hash: string) {
    try {
        const response = await axios.get(`${PINATA_CONFIG.GATEWAY}/${hash}`, {
            headers: {
                'Authorization': `Bearer ${PINATA_CONFIG.JWT}`
            }
        });

        console.log("Metadata retrieved:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching from Pinata:", error);
        if (axios.isAxiosError(error)) {
            console.error("Response:", error.response?.data);
        }
        throw error;
    }
}

async function main() {
    // Get deployed contract
    const pokemonNFT = await ethers.getContractAt(
        "PokemonCardCreation", 
        NFT_CONTRACT_ADDRESS
    );
    
    // Your wallet address
    const recipient = "0x0E0a1b75212295c1d975C9fcFF27AFEd74579666";
    
    // IPFS hash of your Pokemon metadata (replace with your actual hash)
    // 0: NORMAL
    // 1: FIRE
    // 2: WATER
    // 3: ELECTRIC
    // 4: GRASS
    // 5: ICE
    // 6: FIGHTING
    // 7: POISON
    // 8: GROUND
    // 9: FLYING
    // 10: PSYCHIC
    // 11: BUG
    // 12: ROCK
    // 13: GHOST
    // 14: DRAGON
    // 15: DARK
    // 16: STEEL
    // 17: FAIRY
    // 18: LIGHT
    // IPFS hash of your Pokemon metadata
    const ipfsHash = "bafybeiace3j7ff56dwjbwbr5yyox4hvjviue56iigic445gjfvnn3v4g5a";
    const uri = `ipfs://${ipfsHash}`;

    // Pokemon stats (customized for Jungle Pikachiu)
    const stats = {
        hp: 75,        // 0-100 (Slightly sturdy for jungle survival)
        attack: 70,    // 0-100 (Decent physical strikes like vine whips)
        defense: 65,   // 0-100 (Can dodge but not the tankiest)
        speed: 90,     // 0-100 (Fast and nimble like a jungle creature)
        special: 85,   // 0-100 (Strong electric-like plant attacks)
        pokemonType: 4 // 0-18 (4 represents GRASS type)
    };
    
    console.log(`\nMinting Pokemon NFT...`);
    console.log(`Recipient: ${recipient}`);
    console.log(`Metadata URI: ${uri}`);
    console.log("Stats:", stats);
    
    try {
        const tx = await pokemonNFT.mintCard(
            recipient,
            uri,
            stats.hp,
            stats.attack,
            stats.defense,
            stats.speed,
            stats.special,
            stats.pokemonType
        );
        
        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for transaction confirmation...");
        await tx.wait();

        // Get the minted token ID
        const tokenId = await pokemonNFT.cardIdCounter();
        
        console.log("\n✅ Pokemon Minted Successfully!");
        console.log("Token ID:", tokenId.toString());
        console.log(`View on Sepolia Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
        console.log(`View Metadata: ${PINATA_CONFIG.GATEWAY}/${ipfsHash}`);

    } catch (error) {
        console.error("\n❌ Error minting Pokemon NFT:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 