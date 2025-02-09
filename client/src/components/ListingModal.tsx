import React, { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config';

interface NFTContract extends ethers.BaseContract {
  setApprovalForAll(operator: string, approved: boolean): Promise<ethers.ContractTransaction>;
  tokenURI(tokenId: ethers.BigNumberish): Promise<string>;
  cardIdCounter(): Promise<ethers.BigNumberish>;
  ownerOf(tokenId: ethers.BigNumberish): Promise<string>;
  isApprovedForAll(owner: string, operator: string): Promise<boolean>;
}

interface ListingModalProps {
  onClose: () => void;
  ipfsHash: string;
  onSuccess: () => void;
  setToastMessage: (message: string) => void;
  setToastType: (type: 'success' | 'error') => void;
  setShowToast: (show: boolean) => void;
}

const ListingModal: React.FC<ListingModalProps> = ({ onClose, ipfsHash, onSuccess, setToastMessage, setToastType, setShowToast }) => {
  const [price, setPrice] = useState<string>('');
  const [isListing, setIsListing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPrice(value);
    }
  };

  const handleList = async () => {
    if (!window.ethereum || !price) return;

    try {
      setIsListing(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // First get the tokenId for this IPFS hash
      const nftContract = new ethers.Contract(
        CONTRACT_ADDRESSES.NFT_CONTRACT,
        CONTRACT_ABIS.NFT_CONTRACT,
        provider
      ) as any;
      
      // Get total tokens to iterate through
      const totalTokens = await nftContract.cardIdCounter();
      let tokenId;
      
      // Find the token ID that matches our IPFS hash
      for (let i = 1; i <= totalTokens; i++) {
        const uri = await nftContract.tokenURI(i);
        const cleanUri = uri.replace('ipfs://', '');
        if (cleanUri === ipfsHash) {
          tokenId = i;
          break;
        }
      }
      
      if (!tokenId) {
        throw new Error('Token ID not found for this NFT');
      }

      // Check ownership
      const owner = await nftContract.ownerOf(tokenId);
      const currentSigner = await signer.getAddress();
      if (owner.toLowerCase() !== currentSigner.toLowerCase()) {
        throw new Error('You do not own this NFT');
      }

      // Now approve the trading contract
      const nftContractWithSigner = nftContract.connect(signer);
      
      // Check if approved for all
      const isApprovedForAll = await nftContract.isApprovedForAll(
        await signer.getAddress(),
        CONTRACT_ADDRESSES.TRADING_CONTRACT
      );
      
      if (!isApprovedForAll) {
        console.log('Approving trading contract...');
        const approveTx = await nftContractWithSigner.setApprovalForAll(CONTRACT_ADDRESSES.TRADING_CONTRACT, true);
        await approveTx.wait();
        console.log('Trading contract approved');
      } else {
        console.log('Trading contract already approved');
      }

      // Now list the card
      const tradingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
        CONTRACT_ABIS.TRADING_CONTRACT,
        signer
      );

      // Check if already listed
      const [listingPrice, seller, isAuction, active] = await tradingContract.listings(tokenId);
      console.log('Current listing status:', {
        listingPrice: listingPrice.toString(),
        seller,
        isAuction,
        active
      });
      
      if (active) {
        throw new Error('This NFT is already listed');
      }

      const priceInWei = ethers.parseEther(price);
      console.log('Price conversion:', {
        original: price,
        wei: priceInWei.toString()
      });

      try {
        console.log('Attempting to list card with params:', {
          tokenId,
          priceInWei: priceInWei.toString()
        });

        // Estimate gas first to check if transaction will fail
        try {
          const gasEstimate = await tradingContract.listCard.estimateGas(
            tokenId, 
            priceInWei
          );
          console.log('Gas estimate:', gasEstimate.toString());
        } catch (estimateError: any) {
          console.error('Gas estimation failed:', estimateError);
          // Check common failure reasons
          const nftOwner = await nftContract.ownerOf(tokenId);
          const currentAddress = await signer.getAddress();
          
          if (nftOwner.toLowerCase() !== currentAddress.toLowerCase()) {
            throw new Error('You do not own this NFT');
          }
          
          const [, , , isListed] = await tradingContract.listings(tokenId);
          if (isListed) {
            throw new Error('This NFT is already listed');
          }
          
          // If none of the above, throw original error
          throw new Error(`Transaction would fail: ${estimateError.reason || 'Unknown reason'}`);
        }

        // Wait for approval confirmation
        if (!isApprovedForAll) {
          console.log('Waiting for approval confirmation...');
          const isNowApproved = await nftContract.isApprovedForAll(
            await signer.getAddress(),
            CONTRACT_ADDRESSES.TRADING_CONTRACT
          );
          if (!isNowApproved) {
            throw new Error('Trading contract approval failed');
          }
          console.log('Approval confirmed');
        }

        const listTx = await tradingContract.listCard(tokenId, priceInWei);
        console.log('Listing transaction sent:', listTx);
        const receipt = await listTx.wait();
        console.log('Transaction receipt:', receipt);
        
        // After successful listing
        setShowSuccessMessage(true);
        
      } catch (error: any) {
        console.error('Listing transaction failed:', {
          error,
          errorMessage: error.message || 'Unknown error',
          errorData: error.data || null,
          errorReason: error.reason || 'No revert reason',
          errorCode: error.code,
          transaction: error.transaction
        });
        throw new Error(
          `Listing failed: ${error.reason || error.message || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error("Error listing card:", error);
      setToastMessage('Error listing card: ' + (error as Error).message);
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsListing(false);
    }
  };

  const handleSuccessOk = () => {
    onSuccess();
    onClose();
    window.location.href = '/'; // Navigate to main page
  };

  return (
    <div className="listing-modal-overlay" onClick={onClose}>
      <div className="listing-modal-content" onClick={e => e.stopPropagation()}>
        <h3>List Card for Sale</h3>
        <div className="price-input-container">
          <input
            type="text"
            value={price}
            onChange={handlePriceChange}
            placeholder="Enter price in ETH"
            className="price-input"
          />
          <span className="eth-label">ETH</span>
        </div>
        <div className="listing-modal-buttons">
          <button 
            className="cancel-button"
            onClick={onClose}
            disabled={isListing}
          >
            Cancel
          </button>
          <button 
            className="list-button"
            onClick={handleList}
            disabled={!price || isListing}
          >
            {isListing ? 'Listing...' : 'List'}
          </button>
        </div>
      </div>
      {isListing && <div className="listing-loading-overlay" />}
      {showSuccessMessage && (
        <div className="success-popup-overlay">
          <div className="success-popup">
            <h3>Listing Successful!</h3>
            <p>Your NFT has been listed successfully.</p>
            <button className="ok-button" onClick={handleSuccessOk}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingModal; 