import { ethers as hardhatEthers } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";

// TypeChain imports
import { PokemonCardCreation } from "../typechain-types/contracts/pokemonNFT.sol/index";
import { PokemonCardCreation__factory } from "../typechain-types/factories/contracts/pokemonNFT.sol/index";

// In Ethers v6, parseEther is a top-level import
import { parseEther } from "ethers";

describe("PokemonCardCreationTest (Ethers v6)", function () {
  let pokemonNFT: PokemonCardCreation;
  let deployer: Signer;
  let seller: Signer;
  let buyer: Signer;
  let other: Signer;

  beforeEach(async function () {
    // Retrieve signers from Hardhat
    [deployer, seller, buyer, other] = await hardhatEthers.getSigners();

    // Prepare the factory using Hardhat's ethers
    const factory = (await hardhatEthers.getContractFactory(
      "PokemonCardCreation",
      deployer
    )) as PokemonCardCreation__factory;

    // Deploy the contract (no .deployed() in v6)
    const contractInstance = await factory.deploy(await deployer.getAddress());

    // Wait for deployment
    await contractInstance.waitForDeployment();

    // Get deployed address in Ethers v6
    const deployedAddress = await contractInstance.getAddress();
    console.log("Contract deployed to:", deployedAddress);

    // Cast to our TypeChain type
    pokemonNFT = contractInstance as PokemonCardCreation;
  });

  describe("Deployment", function () {
    it("initializes cardIdCounter to zero", async function () {
      expect(await pokemonNFT.cardIdCounter()).to.equal(0);
    });

    it("assigns the correct owner", async function () {
      const ownerAddress = await pokemonNFT.owner();
      expect(ownerAddress).to.equal(await deployer.getAddress());
    });
  });

  describe("Minting", function () {
    it("allows the owner to mint a new card", async function () {
      const uri = "ipfs://test-metadata-1";

      // deployer is the owner
      await expect(
        pokemonNFT.mintCard(await seller.getAddress(), uri)
      )
        .to.emit(pokemonNFT, "CardMinted")
        .withArgs(await seller.getAddress(), 1, uri);

      // Check incremented card ID
      expect(await pokemonNFT.cardIdCounter()).to.equal(1);

      // Check ownership
      expect(await pokemonNFT.ownerOf(1)).to.equal(await seller.getAddress());
    });

    it("reverts if a non-owner tries to mint", async function () {
      const uri = "ipfs://test-metadata-2";
      // seller is not the owner
      await expect(
        pokemonNFT.connect(seller).mintCard(await seller.getAddress(), uri)
      ).to.be.reverted;
    });
  });

  describe("Pausing and Unpausing", function () {
    it("allows the owner to pause and unpause", async function () {
      // Pause
      await expect(pokemonNFT.connect(deployer).pause())
        .to.emit(pokemonNFT, "Paused")
        .withArgs(await deployer.getAddress());

      // Try minting while paused
      await expect(
        pokemonNFT.mintCard(await seller.getAddress(), "ipfs://test-paused")
      ).to.be.reverted;

      // Unpause
      await expect(pokemonNFT.connect(deployer).unpause())
        .to.emit(pokemonNFT, "Unpaused")
        .withArgs(await deployer.getAddress());

      // Minting now succeeds
      await expect(
        pokemonNFT.mintCard(await seller.getAddress(), "ipfs://test-unpaused")
      ).to.not.be.reverted;
    });

    it("reverts if a non-owner tries to pause/unpause", async function () {
      await expect(pokemonNFT.connect(seller).pause()).to.be.reverted;
      await expect(pokemonNFT.connect(seller).unpause()).to.be.reverted;
    });
  });

  describe("Fallback and Receive", function () {
    it("reverts when sending ETH with data (fallback)", async function () {
      // We must await getAddress in v6 to get the contract's address
      const nftAddress = await pokemonNFT.getAddress();
      await expect(
        deployer.sendTransaction({
          to: nftAddress,
          value: parseEther("0.1"),
          data: "0x1234",
        })
      ).to.be.revertedWith("Fallback: Ether not accepted");
    });

    it("reverts when sending ETH without data (receive)", async function () {
      const nftAddress = await pokemonNFT.getAddress();
      await expect(
        deployer.sendTransaction({
          to: nftAddress,
          value: parseEther("0.1"),
        })
      ).to.be.revertedWith("Receive: Ether not accepted");
    });
  });
});
