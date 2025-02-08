import { ethers, run } from "hardhat";

async function main() {
  console.log("Deploying contracts...");
  
  // Deploy NFT contract
  const NFT = await ethers.getContractFactory("pokemonNFT");
  const [deployer] = await ethers.getSigners();  // Get the deployer's address
  const nft = await NFT.deploy(deployer.address); // Pass the deployer's address as initialOwner
  await nft.waitForDeployment();
  console.log("NFT deployed to:", await nft.getAddress());

  // Deploy Trading contract
  const Trading = await ethers.getContractFactory("PokemonCardTrading");
  const trading = await Trading.deploy(await nft.getAddress());
  await trading.waitForDeployment();
  console.log("Trading deployed to:", await trading.getAddress());

  // Verify contracts if ETHERSCAN_API_KEY exists
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations...");
    await nft.deploymentTransaction()?.wait(6);
    await trading.deploymentTransaction()?.wait(6);

    // Verify NFT contract
    await verify(await nft.getAddress(), []);
    
    // Verify Trading contract
    await verify(await trading.getAddress(), [await nft.getAddress()]);
  }
}

async function verify(contractAddress: string, args: any[]) {
  console.log(`Verifying contract at ${contractAddress}`);
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    } as any);
  } catch (e: any) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already verified!");
    } else {
      console.log(e);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 