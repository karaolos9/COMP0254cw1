import { task } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";

// Replace with your actual deployed contract address
const NFT_CONTRACT_ADDRESS = "0x9550C786877ECdfbEb4dE17b9644B5b47B1BF1aF";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";  // Standard burn address

export default task("burn", "Burns a Pokemon NFT token")
  .addParam("tokenid", "The token ID to burn")
  .setAction(async (taskArgs, hre) => {
    try {
        const [signer] = await hre.ethers.getSigners();
        const pokemonNFT = await hre.ethers.getContractAt(
            "PokemonCardCreation",
            NFT_CONTRACT_ADDRESS,
            signer
        );

        const tokenId = Number(taskArgs.tokenid);
        const signerAddress = await signer.getAddress();

        // Get token info before burning
        const uri = await pokemonNFT.tokenURI(tokenId);
        const owner = await pokemonNFT.ownerOf(tokenId);
        
        // Check ownership
        if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
            throw new Error("You must be the token owner to burn it");
        }

        console.log("\n🔍 Token Information:");
        console.log(`Token ID: ${tokenId}`);
        console.log(`IPFS Hash: ${uri.replace('ipfs://', '')}`);
        console.log(`Owner: ${owner}`);

        // Confirm burning
        console.log("\n⚠️ WARNING: This action cannot be undone!");
        console.log("Proceeding with token burn...");

        // First approve the contract to handle the token
        console.log("\n🔑 Approving token transfer...");
        const approveTx = await pokemonNFT.approve(NFT_CONTRACT_ADDRESS, tokenId);
        console.log("Approval transaction hash:", approveTx.hash);
        await approveTx.wait();
        console.log("✅ Approval confirmed");

        // Now transfer the token to dead address (burn)
        console.log("\n🔥 Burning token...");
        const tx = await pokemonNFT.transferFrom(
            owner,
            DEAD_ADDRESS,
            tokenId
        );
        
        console.log("⏳ Transaction sent, waiting for confirmation...");
        console.log("Transaction hash:", tx.hash);
        
        await tx.wait();
        
        console.log("\n✅ Token successfully burned!");
        console.log(`🔍 View on Sepolia Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);

    } catch (error: any) {
        if (error.message.includes("caller is not token owner")) {
            console.error("\n❌ Error: You must be the token owner to burn it");
        } else if (error.message.includes("nonexistent token")) {
            console.error("\n❌ Error: Token does not exist");
        } else {
            console.error("\n❌ Error burning token:", error);
        }
        process.exit(1);
    }
}); 