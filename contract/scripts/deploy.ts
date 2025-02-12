import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying contracts with deployer: ${deployer.address}`);

  // Deploy PokemonCardCreation contract first
  console.log("\nDeploying PokemonCardCreation contract...");
  const PokemonCardCreation = await ethers.getContractFactory("PokemonCardCreation");
  const pokemonCardCreation = await PokemonCardCreation.deploy(deployer.address);
  await pokemonCardCreation.waitForDeployment();
  const pokemonCardCreationAddress = await pokemonCardCreation.getAddress();
  console.log(`PokemonCardCreation contract deployed at: ${pokemonCardCreationAddress}`);

  // Deploy PokemonCardTrading contract with PokemonCardCreation address
  console.log("\nDeploying PokemonCardTrading contract...");
  const PokemonCardTrading = await ethers.getContractFactory("PokemonCardTrading");
  const pokemonCardTrading = await PokemonCardTrading.deploy(pokemonCardCreationAddress);
  await pokemonCardTrading.waitForDeployment();
  const pokemonCardTradingAddress = await pokemonCardTrading.getAddress();
  console.log(`PokemonCardTrading contract deployed at: ${pokemonCardTradingAddress}`);

  // Log all deployment addresses for easy reference
  console.log("\nDeployment Summary:");
  console.log("--------------------");
  console.log(`PokemonCardCreation: ${pokemonCardCreationAddress}`);
  console.log(`PokemonCardTrading: ${pokemonCardTradingAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 