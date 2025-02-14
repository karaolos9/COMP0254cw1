import { ethers } from 'ethers';

// const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
const TRADING_CONTRACT_ADDRESS = import.meta.env.VITE_TRADING_CONTRACT_ADDRESS;

export async function buyNFT(tokenId: string, price: number) {
  try {
    if (!window.ethereum) throw new Error("No wallet found");
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Create contract instance
    const tradingContract = new ethers.Contract(
      TRADING_CONTRACT_ADDRESS,
      ['function buyCard(uint256 tokenId) external payable'],
      signer
    );

    // Convert price from ETH to Wei
    const priceInWei = ethers.parseEther(price.toString());
    
    // Execute purchase
    const tx = await tradingContract.buyCard(tokenId, {
      value: priceInWei
    });
    
    return await tx.wait();
  } catch (error) {
    console.error('Error buying NFT:', error);
    throw error;
  }
} 