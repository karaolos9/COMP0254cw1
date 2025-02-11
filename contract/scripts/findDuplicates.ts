import { ethers } from "hardhat";
import { PINATA_CONFIG } from "../config/pinata";

// Replace with your actual deployed contract address
const NFT_CONTRACT_ADDRESS = "0x9550C786877ECdfbEb4dE17b9644B5b47B1BF1aF";

interface TokenInfo {
    tokenId: number;
    uri: string;
    owner: string;
}

async function findDuplicates() {
    const pokemonNFT = await ethers.getContractAt(
        "PokemonCardCreation",
        NFT_CONTRACT_ADDRESS
    );

    console.log("\n🔍 Scanning for duplicate NFTs...");
    
    const uriMap = new Map<string, TokenInfo[]>();
    const totalTokens = await pokemonNFT.cardIdCounter();

    console.log(`Total tokens to scan: ${totalTokens}`);

    // Scan all tokens
    for (let tokenId = 1; tokenId <= totalTokens; tokenId++) {
        try {
            const uri = await pokemonNFT.tokenURI(tokenId);
            const owner = await pokemonNFT.ownerOf(tokenId);
            const cleanUri = uri.replace('ipfs://', '');

            const tokenInfo: TokenInfo = {
                tokenId,
                uri: cleanUri,
                owner
            };

            if (!uriMap.has(cleanUri)) {
                uriMap.set(cleanUri, [tokenInfo]);
            } else {
                uriMap.get(cleanUri)?.push(tokenInfo);
            }

            process.stdout.write(`\rScanning token ${tokenId}/${totalTokens}`);
        } catch (error) {
            // Skip if token doesn't exist or other error
            continue;
        }
    }

    console.log("\n\n📊 Duplicate NFTs Report:");
    
    let hasDuplicates = false;
    for (const [uri, tokens] of uriMap.entries()) {
        if (tokens.length > 1) {
            hasDuplicates = true;
            console.log(`\n🎴 IPFS Hash: ${uri}`);
            console.log(`Found ${tokens.length} copies:`);
            tokens.forEach(token => {
                console.log(`  - Token ID: ${token.tokenId}, Owner: ${token.owner}`);
            });
            console.log(`View on Pinata: ${PINATA_CONFIG.GATEWAY}/${uri}`);
        }
    }

    if (!hasDuplicates) {
        console.log("✅ No duplicates found!");
        return;
    }

    console.log("\n⚠️ To burn a duplicate token, use the following command:");
    console.log("npx hardhat run scripts/burnToken.ts --network sepolia --tokenid <TOKEN_ID>");
}

findDuplicates()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 