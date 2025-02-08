import { ethers } from "hardhat";
import axios from "axios";
import { PINATA_CONFIG } from "../config/pinata";
import { fetchPinataItems } from "../config/pinata";

// Replace with your actual deployed contract address
const NFT_CONTRACT_ADDRESS = "0xC252E988c7dE8a2BFbf6cE0a1A92FECE5A74C4D1";

async function getPinataMetadata() {
    try {
        const limit = 1000; // Increase items per page
        const response = await axios.get(`${PINATA_CONFIG.API_URL}/data/pinList`, {
            headers: {
                'Authorization': `Bearer ${PINATA_CONFIG.JWT}`
            },
            params: {
                status: 'pinned',
                pageLimit: limit,
                pageOffset: 0
            }
        });

        // Log raw response to see what we're getting
        console.log("Total count:", response.data.count);
        console.log("Raw Pinata response:", JSON.stringify(response.data, null, 2));

        // Extract all items without filtering
        const pokemonMetadata = response.data.rows.map((item: any) => ({
            name: item.metadata?.name || `Pokemon ${item.id}`,
            uri: `ipfs://${item.ipfs_pin_hash}`,
            hash: item.ipfs_pin_hash,
            metadata: item.metadata
        }));

        console.log(`Found ${pokemonMetadata.length} items`);
        return pokemonMetadata;
    } catch (error) {
        console.error("Error fetching from Pinata:", error);
        if (axios.isAxiosError(error)) {
            console.error("Response:", error.response?.data);
        }
        throw error;
    }
}

async function main() {
    // Get deployed contract using address
    const pokemonNFT = await ethers.getContractAt(
        "pokemonNFT", 
        NFT_CONTRACT_ADDRESS
    );
    
    // Get current counter
    const currentCounter = await pokemonNFT.cardIdCounter();
    const startingId = Number(currentCounter);

    // Fetch metadata from Pinata
    console.log("Fetching Pokemon metadata from Pinata...");
    const items = await getPinataMetadata();
    console.log(`Found ${items.length} Pokemon metadata files on Pinata`);

    // Your MetaMask address
    const recipient = "0x0E0a1b75212295c1d975C9fcFF27AFEd74579666";

    console.log(`\nStarting from token #${startingId + 1}`);
    
    for (let i = startingId; i < items.length; i++) {
        const pokemon = items[i];
        console.log(`\nMinting ${pokemon.name} (${i + 1}/${items.length})`);
        console.log(`Metadata URI: ${pokemon.uri}`);
        
        try {
            const tx = await pokemonNFT.mintCard(recipient, pokemon.uri);
            console.log("Transaction hash:", tx.hash);
            
            console.log("Waiting for transaction confirmation...");
            await tx.wait();

            // Get the latest minted token ID
            const tokenId = await pokemonNFT.cardIdCounter();
            
            console.log("\n✅ Pokemon Minted Successfully!");
            console.log("Token ID:", tokenId.toString());
            console.log(`View on Sepolia Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
            console.log(`View Metadata: ${PINATA_CONFIG.GATEWAY}/${pokemon.uri.replace('ipfs://', '')}`);

            // Add a delay between mints to prevent network congestion
            if (i < items.length - 1) {
                console.log("\nWaiting 5 seconds before next mint...");
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } catch (error) {
            console.error(`\n❌ Error minting ${pokemon.name}:`, error);
            throw error;
        }
    }

    console.log("\n🎉 All remaining Pokemon NFTs have been minted successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 