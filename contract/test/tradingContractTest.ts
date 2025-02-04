import { ethers as hardhatEthers } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { parseEther } from "ethers";

//Tests made using ethers v6

import { PokemonCardTrading } from "../typechain-types/contracts/TradingContractCW1.sol/index";
import { PokemonCardTrading__factory } from "../typechain-types/factories/contracts/TradingContractCW1.sol/index";
import { PokemonCardCreation } from "../typechain-types/contracts/pokemonNFT.sol/index";
import { PokemonCardCreation__factory } from "../typechain-types/factories/contracts/pokemonNFT.sol/index";

describe("PokemonCardTradingTest", function () {
  let tradingContract: PokemonCardTrading;
  let nftContract: PokemonCardCreation;
  let deployer: Signer;
  let seller: Signer;
  let buyer: Signer;
  let other: Signer;
  let tokenId: number;

  beforeEach(async function () {
    [deployer, seller, buyer, other] = await hardhatEthers.getSigners();

    // Deploy the NFT contract
    const nftFactory = (await hardhatEthers.getContractFactory("PokemonCardCreation", deployer)) as PokemonCardCreation__factory;
    nftContract = (await nftFactory.deploy(await deployer.getAddress())) as PokemonCardCreation;

    // Deploy the Trading contract with the NFT contract's address
    const tradingFactory = (await hardhatEthers.getContractFactory("PokemonCardTrading", deployer)) as PokemonCardTrading__factory;
    tradingContract = (await tradingFactory.deploy(await nftContract.getAddress())) as PokemonCardTrading;

    // Mint one NFT for testing (tokenId = 1)
    await nftContract.connect(deployer).mintCard(await seller.getAddress(), "ipfs://test-metadata");
    tokenId = 1;

  });
  describe("Constructor", function () {
    it("should revert if the NFT contract address is zero", async function () {
      const tradingFactory = await hardhatEthers.getContractFactory("PokemonCardTrading", deployer);
      await expect(tradingFactory.deploy(hardhatEthers.ZeroAddress))
        .to.be.revertedWithCustomError(tradingContract, "InvalidNFT");
    });
  });

  describe("Deployment", function () {
    it("should initialize with the correct NFT contract address", async function () {
      expect(await tradingContract.nftContract()).to.equal(await nftContract.getAddress());
    });
  });

  describe("Fixed Price Sales", function () {
    beforeEach(async function () {
      // Seller approves the trading contract to manage the NFT
      await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
    });

    it("should list a card for sale successfully", async function () {
      const price = parseEther("1");
      await expect(tradingContract.connect(seller).listCard(tokenId, price))
        .to.emit(tradingContract, "CardListed")
        .withArgs(tokenId, await seller.getAddress(), price, false);

      // Verify listing values
      const listing = await tradingContract.listings(tokenId);
      expect(listing.seller).to.equal(await seller.getAddress());
      expect(listing.price).to.equal(price);
      expect(listing.isAuction).to.equal(false);
      expect(listing.isActive).to.equal(true);
      // The NFT should now be held by the trading contract
      expect(await nftContract.ownerOf(tokenId)).to.equal(await tradingContract.getAddress());
    });

    it("should revert if the listing price is zero", async function () {
      await expect(tradingContract.connect(seller).listCard(tokenId, 0))
        .to.be.revertedWithCustomError(tradingContract, "InvalidPrice");
    });

    it("should revert if a non-owner tries to list the NFT", async function () {
      await expect(tradingContract.connect(buyer).listCard(tokenId, parseEther("1")))
        .to.be.revertedWithCustomError(tradingContract, "NotOwner");
    });

    it("should revert if listing an already listed NFT", async function () {
      await tradingContract.connect(seller).listCard(tokenId, parseEther("1"));
    
      await expect(tradingContract.connect(seller).listCard(tokenId, parseEther("1")))
        .to.be.revertedWithCustomError(tradingContract, "NFT_AlreadyListed");
    });

    it("should allow multiple sellers to list NFTs", async function () {
      await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
      await tradingContract.connect(seller).listCard(tokenId, parseEther("1"));
  
      const tokenId2 = 2;
      await nftContract.connect(deployer).mintCard(await other.getAddress(), "ipfs://test-metadata");
      await nftContract.connect(other).approve(await tradingContract.getAddress(), tokenId2);
      await tradingContract.connect(other).listCard(tokenId2, parseEther("2"));
  
      expect((await tradingContract.listings(tokenId)).seller).to.equal(await seller.getAddress());
      expect((await tradingContract.listings(tokenId2)).seller).to.equal(await other.getAddress());
    });

    describe("Buying a Card", function () {
      beforeEach(async function () {
        // List the NFT for sale
        await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
        await tradingContract.connect(seller).listCard(tokenId, parseEther("1"));
      });

      it("should allow a buyer to purchase the NFT", async function () {
        await expect(tradingContract.connect(buyer).buyCard(tokenId, { value: parseEther("1") }))
          .to.emit(tradingContract, "SaleCompleted")
          .withArgs(tokenId, await buyer.getAddress(), parseEther("1"));
        // Verify NFT ownership has transferred to buyer
        expect(await nftContract.ownerOf(tokenId)).to.equal(await buyer.getAddress());
      });

      it("should refund excess funds when buying", async function () {
        const buyerBalanceBefore = await hardhatEthers.provider.getBalance(await buyer.getAddress());
  
        // Buyer pays 2 ETH for a listing that costs 1 ETH
        const tx = await tradingContract.connect(buyer).buyCard(tokenId, { value: parseEther("2") });
        const receipt = await tx.wait();
        if (!receipt) throw new Error("Transaction receipt is null");

        // Verify NFT transferred
        expect(await nftContract.ownerOf(tokenId)).to.equal(await buyer.getAddress());

        // Calculate how much the buyer really spent
        const gasCost = receipt.gasUsed * (receipt.gasPrice ?? BigInt(0));
        const buyerBalanceAfter = await hardhatEthers.provider.getBalance(await buyer.getAddress());
        const totalSpent = buyerBalanceBefore - (buyerBalanceAfter) - (gasCost);

        // They should effectively spend ~1 ETH (the listing price), not 2 ETH
        expect(totalSpent).to.be.closeTo(parseEther("1"), parseEther("0.001"));

      });

      it("should revert if insufficient funds are sent", async function () {
        await expect(tradingContract.connect(buyer).buyCard(tokenId, { value: parseEther("0.5") }))
          .to.be.revertedWithCustomError(tradingContract, "InsufficientPayment");
      });

      it("should revert if trying to buy an already sold (inactive) listing", async function () {
        await tradingContract.connect(buyer).buyCard(tokenId, { value: parseEther("1") });
        await expect(tradingContract.connect(buyer).buyCard(tokenId, { value: parseEther("1") }))
          .to.be.revertedWithCustomError(tradingContract, "InactiveListing");
      });
      
      // Add this new test
      it("should handle exact payment amounts", async function () {
        await tradingContract.connect(buyer).buyCard(tokenId, { value: parseEther("1") });
        expect(await nftContract.ownerOf(tokenId)).to.equal(await buyer.getAddress());
      });
    });

    describe("Canceling a Fixed Price Listing", function () {
      beforeEach(async function () {
        // List the NFT for sale
        await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
        await tradingContract.connect(seller).listCard(tokenId, parseEther("1"));
      });

      it("should allow the seller to cancel the listing and get the NFT back", async function () {
        await tradingContract.connect(seller).cancelListing(tokenId);
        // After canceling, the NFT should return to the seller
        expect(await nftContract.ownerOf(tokenId)).to.equal(await seller.getAddress());
      });
      
      it("should revert if someone other than the seller attempts to cancel", async function () {
        await expect(tradingContract.connect(buyer).cancelListing(tokenId))
          .to.be.revertedWithCustomError(tradingContract, "Unauthorized");
      });
    });
  });

  describe("Auction Functionality", function () {
    describe("Starting an Auction", function () {
      beforeEach(async function () {
        // Seller approves NFT for auction
        await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
      });

      it("should start an auction successfully", async function () {
        const startingBid = parseEther("1");
        const duration = 3600;
        await expect(tradingContract.connect(seller).startAuction(tokenId, startingBid, duration))
          .to.emit(tradingContract, "CardListed")
          .withArgs(tokenId, await seller.getAddress(), startingBid, true);

        const listing = await tradingContract.listings(tokenId);
        expect(listing.seller).to.equal(await seller.getAddress());
        expect(listing.price).to.equal(0); // For auctions, the fixed price is set to 0
        expect(listing.isAuction).to.equal(true);
        expect(listing.isActive).to.equal(true);

        const auction = await tradingContract.auctions(tokenId);
        expect(auction.askingPrice).to.equal(startingBid);
        expect(auction.highestBid).to.equal(0);
        expect(auction.highestBidder).to.equal(hardhatEthers.ZeroAddress);
      });

      it("should revert if the starting bid is zero", async function () {
        await expect(tradingContract.connect(seller).startAuction(tokenId, 0, 3600))
          .to.be.revertedWithCustomError(tradingContract, "InvalidPrice");
      });

      it("should revert if the duration is zero", async function () {
        await expect(tradingContract.connect(seller).startAuction(tokenId, parseEther("1"), 0))
          .to.be.revertedWithCustomError(tradingContract, "AuctionDurationZero");
      });

      it("should accept exactly MAX_DURATION", async function () {
        const MAX_DURATION = await tradingContract.MAX_DURATION();
        await expect(tradingContract.connect(seller).startAuction(tokenId, parseEther("1"), MAX_DURATION))
          .to.emit(tradingContract, "CardListed");
      });

      it("should revert if the duration exceeds the maximum allowed", async function () {
        // MAX_DURATION is 30 days, so use a duration that is too long.
        const duration = (30 * 24 * 3600) + 1;
        await expect(tradingContract.connect(seller).startAuction(tokenId, parseEther("1"), duration))
          .to.be.revertedWithCustomError(tradingContract, "DurationTooLong");
      });

      it("should allow withdrawing funds during active auction", async function () {
        // Start the auction first
        await tradingContract.connect(seller).startAuction(tokenId, parseEther("1"), 3600);
      
        // Place bids
        await tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("2") });
        await tradingContract.connect(other).placeBid(tokenId, { value: parseEther("3") });
      
        // Withdraw while auction is active
        await expect(tradingContract.connect(buyer).withdrawFunds())
          .to.emit(tradingContract, "Withdrawal");
      });

      it("should calculate minimum bids correctly", async function () {
        await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
        await tradingContract.connect(seller).startAuction(tokenId, parseEther("1"), 3600);
        await tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("2") });
      
        const minBid = (parseEther("2") * BigInt(105)) / BigInt(100);
        await expect(tradingContract.connect(other).placeBid(tokenId, { value: minBid }))
          .to.emit(tradingContract, "AuctionBid");
      });
      
    });

    describe("Bidding on an Auction", function () {
      beforeEach(async function () {
        // Approve and start an auction
        await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
        await tradingContract.connect(seller).startAuction(tokenId, parseEther("1"), 3600);
      });

      it("should allow a valid bid", async function () {
        await expect(tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("2") }))
          .to.emit(tradingContract, "AuctionBid")
          .withArgs(tokenId, await buyer.getAddress(), parseEther("2"));

        const auction = await tradingContract.auctions(tokenId);
        expect(auction.highestBid).to.equal(parseEther("2"));
        expect(auction.highestBidder).to.equal(await buyer.getAddress());
      });

      it("should revert if a bid is below the asking price when no bid exists", async function () {
        await expect(tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("0.5") }))
          .to.be.revertedWithCustomError(tradingContract, "LowBid");
      });

      it("should revert if the bid is below the required minimum increment", async function () {
        // Place an initial bid.
        await tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("2") });
        // Other bidder attempts a bid that is too low.
        // Minimum required: current bid * (100 + MIN_INCREMENT) / 100.
        await expect(tradingContract.connect(other).placeBid(tokenId, { value: parseEther("2") }))
          .to.be.revertedWithCustomError(tradingContract, "LowBid");
      });

      it("should revert if bidding after the auction has ended", async function () {
        // Increase time past auction duration.
        await hardhatEthers.provider.send("evm_increaseTime", [4000]);
        await hardhatEthers.provider.send("evm_mine", []);
        await expect(tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("3") }))
          .to.be.revertedWithCustomError(tradingContract, "AuctionHasEnded");
      });

      // Add these new tests
      it("should accept exact minimum bid increments", async function () {
        await tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("2") });
      
        const minBid = (parseEther("2") * BigInt(105)) / BigInt(100);
        await expect(tradingContract.connect(other).placeBid(tokenId, { value: minBid }))
          .to.emit(tradingContract, "AuctionBid");
      });

      it("should allow withdrawing funds during active auction", async function () {   
        // Place bids
        await tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("2") });
        await tradingContract.connect(other).placeBid(tokenId, { value: parseEther("3") });
      
        // Withdraw while auction is active
        await expect(tradingContract.connect(buyer).withdrawFunds())
          .to.emit(tradingContract, "Withdrawal");
      });
      

      it("should handle multiple pending withdrawals", async function () {
        // First bid by buyer
        await tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("2") });
        // Outbid by other
        await tradingContract.connect(other).placeBid(tokenId, { value: parseEther("3") });


      
        const buyerBalanceBefore = await hardhatEthers.provider.getBalance(await buyer.getAddress());
        
        const tx = await tradingContract.connect(buyer).withdrawFunds();
        const receipt = await tx.wait();
        if (!receipt) throw new Error("Transaction receipt is null");
        const gasCost = receipt.gasUsed * (receipt.gasPrice ?? BigInt(0));
        const buyerBalanceAfter = await hardhatEthers.provider.getBalance(await buyer.getAddress());
      
        expect(buyerBalanceAfter - buyerBalanceBefore).to.be.closeTo(parseEther("2"), gasCost);
      });
      
    });

    describe("Finalizing an Auction", function () {
      context("when there is a winning bid", function () {
        beforeEach(async function () {
          await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
          // Start an auction with a short duration
          await tradingContract.connect(seller).startAuction(tokenId, parseEther("1"), 3);
          await tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("2") });
          // Advance time to ensure the auction ends.
          await hardhatEthers.provider.send("evm_increaseTime", [4]);
          await hardhatEthers.provider.send("evm_mine", []);
        });

        it("should allow owner to finalize auction", async function () {
          await hardhatEthers.provider.send("evm_increaseTime", [4]);
          await hardhatEthers.provider.send("evm_mine", []);
        
          await expect(tradingContract.connect(deployer).finalizeAuction(tokenId))
            .to.emit(tradingContract, "AuctionEnded");
        });
      
        it("should reject unauthorized auction finalization", async function () {
          await hardhatEthers.provider.send("evm_increaseTime", [4]);
          await hardhatEthers.provider.send("evm_mine", []);
          
          await expect(tradingContract.connect(buyer).finalizeAuction(tokenId))
            .to.be.revertedWithCustomError(tradingContract, "Unauthorized");
        });
      
        it("should clear auction data after finalization", async function () {
          await hardhatEthers.provider.send("evm_increaseTime", [4]);
          await hardhatEthers.provider.send("evm_mine", []);
          
          await tradingContract.connect(seller).finalizeAuction(tokenId);
          
          const auction = await tradingContract.auctions(tokenId);
          expect(auction.endTime).to.equal(0);
          expect(await tradingContract.listings(tokenId)).to.deep.equal([
            hardhatEthers.ZeroAddress,
            0,
            false,
            false
          ]);
        });

        it("should finalize the auction: transferring NFT to highest bidder and funds to seller", async function () {
          const sellerBalanceBefore = await hardhatEthers.provider.getBalance(await seller.getAddress());
          await expect(tradingContract.connect(seller).finalizeAuction(tokenId))
            .to.emit(tradingContract, "AuctionEnded")
            .withArgs(tokenId, await buyer.getAddress(), parseEther("2"));
          // NFT ownership should now be with the buyer.
          expect(await nftContract.ownerOf(tokenId)).to.equal(await buyer.getAddress());
          // Seller's balance should increase (ignoring gas costs).
          const sellerBalanceAfter = await hardhatEthers.provider.getBalance(await seller.getAddress());
          expect(sellerBalanceAfter).to.be.gt(sellerBalanceBefore);
        });
      });

      context("when there are no bids", function () {
        beforeEach(async function () {
          await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
          await tradingContract.connect(seller).startAuction(tokenId, parseEther("1"), 3);
          // No bids are placed; advance time to end the auction.
          await hardhatEthers.provider.send("evm_increaseTime", [4]);
          await hardhatEthers.provider.send("evm_mine", []);
        });

        it("should return NFT to seller if auction ends with no bids", async function () {
          await expect(tradingContract.connect(seller).finalizeAuction(tokenId))
            .to.emit(tradingContract, "AuctionEnded")
            .withArgs(tokenId, hardhatEthers.ZeroAddress, 0);

          expect(await nftContract.ownerOf(tokenId)).to.equal(await seller.getAddress());
        });
        
      });

      context("when the auction is still active", function () {
        beforeEach(async function () {
          await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
          await tradingContract.connect(seller).startAuction(tokenId, parseEther("1"), 100);
          await tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("2") });
          // Do not advance time so the auction remains active.
        });

        it("should revert finalization before auction end", async function () {
          await expect(tradingContract.connect(seller).finalizeAuction(tokenId))
            .to.be.revertedWithCustomError(tradingContract, "AuctionNotEnded");
        });
      });
    });
  });
  

  describe("Withdraw Funds", function () {
    it("should revert if no funds are available for withdrawal", async function () {
      await expect(tradingContract.connect(buyer).withdrawFunds())
        .to.be.revertedWithCustomError(tradingContract, "NothingToWithdraw");
    });

    it("should allow a bidder to withdraw funds after being outbid", async function () {
      await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
      await tradingContract.connect(seller).startAuction(tokenId, parseEther("1"), 3600);
    
      // First bid by buyer
      await tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("2") });
      // Outbid by other
      await tradingContract.connect(other).placeBid(tokenId, { value: parseEther("3") });
    
      // Now buyer should have funds to withdraw
      const buyerBalanceBefore = await hardhatEthers.provider.getBalance(await buyer.getAddress());
      await tradingContract.connect(buyer).withdrawFunds();
      const buyerBalanceAfter = await hardhatEthers.provider.getBalance(await buyer.getAddress());
    
      expect(buyerBalanceAfter).to.be.gt(buyerBalanceBefore);
    });
    

    // Add this new test
    it("should handle multiple pending withdrawals", async function () {
      // Ensure auction exists
      await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
      await tradingContract.connect(seller).startAuction(tokenId, parseEther("1"), 3600);

      // Place bids
      await tradingContract.connect(buyer).placeBid(tokenId, { value: parseEther("2") });
      await tradingContract.connect(other).placeBid(tokenId, { value: parseEther("3") });

      // Check balances
      const initialBalance = await hardhatEthers.provider.getBalance(await buyer.getAddress());
      await tradingContract.connect(buyer).withdrawFunds();
      const finalBalance = await hardhatEthers.provider.getBalance(await buyer.getAddress());
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

describe("Pause and Unpause", function () {
  it("should allow the owner to pause and unpause the contract", async function () {
    // Pause the contract and verify that functions revert
    await tradingContract.connect(deployer).pause();
    await expect(tradingContract.connect(seller).listCard(tokenId, parseEther("1")))
      .to.be.revertedWithCustomError(tradingContract, "EnforcedPause"); // OpenZeppelin Pausable error

    // Unpause and verify functionality resumes
    await tradingContract.connect(deployer).unpause();
    await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
    await expect(tradingContract.connect(seller).listCard(tokenId, parseEther("1")))
      .to.emit(tradingContract, "CardListed");
  });

  it("should revert if a non-owner attempts to pause or unpause", async function () {
    await expect(tradingContract.connect(seller).pause())
      .to.be.revertedWithCustomError(tradingContract, "OwnableUnauthorizedAccount"); // OpenZeppelin Ownable error
    await expect(tradingContract.connect(seller).unpause())
      .to.be.revertedWithCustomError(tradingContract, "OwnableUnauthorizedAccount");
  });
 });

  describe("Access Control and Approvals", function () {
    it("should revert if listing is attempted without NFT approval", async function () {
      // Seller does not approve the trading contract before listing.
      await expect(tradingContract.connect(seller).listCard(tokenId, parseEther("1")))
        .to.be.revertedWithCustomError(tradingContract, "NotApproved");
    });

    it("should revert if a non-owner calls listCard", async function () {
      await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
      await expect(tradingContract.connect(buyer).listCard(tokenId, parseEther("1")))
        .to.be.revertedWithCustomError(tradingContract, "NotOwner");
    });

      // Add these new tests
    it("should list with setApprovalForAll approval", async function () {
      await nftContract.connect(seller).setApprovalForAll(tradingContract.getAddress(), true);
      await expect(tradingContract.connect(seller).listCard(tokenId, parseEther("1")))
        .to.emit(tradingContract, "CardListed");
    });

    it("should revert finalizing fixed-price listing as auction", async function () {
      await nftContract.connect(seller).approve(await tradingContract.getAddress(), tokenId);
      await tradingContract.connect(seller).listCard(tokenId, parseEther("1"));
    
      await expect(tradingContract.connect(seller).finalizeAuction(tokenId))
        .to.be.revertedWithCustomError(tradingContract, "NotAnAuction");
    });
    
  });
});
