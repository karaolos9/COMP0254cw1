import React, { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config';
import '../styles/ListingModal.css';

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
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPrice(value);
    }
  };

  const handleList = async () => {
    try {
      // Add validation before starting the listing process
      const priceNum = parseFloat(price);
      if (isNaN(priceNum)) {
        throw new Error('Please enter a valid price');
      }
      if (priceNum < 0.001) {
        throw new Error('Price must be at least 0.001 ETH');
      }
      if (priceNum > 10000) {
        throw new Error('Price cannot exceed 10000 ETH');
      }

      setIsListing(true);
      if (!window.ethereum || !price) return;
      
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
          console.log('Found matching token ID:', i);
          break;
        }
      }
      
      if (!tokenId) {
        throw new Error('Token ID not found for this NFT');
      }

      // Check ownership
      const owner = await nftContract.ownerOf(tokenId);
      const currentSigner = await signer.getAddress();
      console.log('Owner:', owner);
      console.log('Current signer:', currentSigner);
      
      if (owner.toLowerCase() !== currentSigner.toLowerCase()) {
        throw new Error('You do not own this NFT');
      }

      // Now check and approve the trading contract if needed
      const nftContractWithSigner = nftContract.connect(signer);
      
      // Check if approved for all
      const isApprovedForAll = await nftContract.isApprovedForAll(
        currentSigner,
        CONTRACT_ADDRESSES.TRADING_CONTRACT
      );
      
      console.log('Is approved for all:', isApprovedForAll);
      
      if (!isApprovedForAll) {
        console.log('Approving trading contract...');
        try {
          const approveTx = await nftContractWithSigner.setApprovalForAll(CONTRACT_ADDRESSES.TRADING_CONTRACT, true);
          console.log('Approval transaction sent:', approveTx.hash);
          await approveTx.wait();
          console.log('Approval confirmed');
        } catch (approvalError: any) {
          console.error('Error during approval:', approvalError);
          throw new Error(`Approval failed: ${approvalError.message}`);
        }
      }

      // Now list the card
      const tradingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
        CONTRACT_ABIS.TRADING_CONTRACT,
        signer
      );

      const priceInWei = ethers.parseEther(price);
      console.log('Listing card with price:', priceInWei.toString());
      
      const listTx = await tradingContract.listCard(tokenId, priceInWei);
      console.log('Listing transaction sent:', listTx.hash);
      await listTx.wait();
      console.log('Listing confirmed');
      
      setIsSuccess(true);
      setIsListing(false);
    } catch (error: any) {
      console.error("Error listing card:", error);
      let errorMessage = 'Error listing card: ';
      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds for transaction';
      } else if (error.message.includes('You do not own this NFT')) {
        errorMessage += 'You do not own this NFT';
      } else if (error.message.includes('Token ID not found')) {
        errorMessage += 'Token ID not found for this NFT';
      } else if (error.message.includes('Approval failed')) {
        errorMessage += error.message;
      } else {
        errorMessage += error.reason || error.message || 'Unknown error occurred';
      }
      
      setToastMessage(errorMessage);
      setToastType('error');
      setShowToast(true);
      setIsListing(false);
    }
  };

  const handleSuccessOk = () => {
    onSuccess();
    onClose();
    window.location.reload();
  };

  return (
    <div 
      className="listing-modal-overlay" 
      onClick={isSuccess ? handleSuccessOk : isListing ? undefined : onClose}
      style={{ cursor: isListing ? 'not-allowed' : 'pointer' }}
    >
      <div className="listing-modal-content" onClick={isSuccess ? handleSuccessOk : e => e.stopPropagation()}>
        {isSuccess ? (
          <div className="listing-success">
            <i className="fas fa-check-circle"></i>
            <h3>NFT Listed Successfully!</h3>
            <button className="success-ok-button" onClick={handleSuccessOk}>
              OK
            </button>
          </div>
        ) : (
          <div className={`modal-content-container ${isListing ? 'fade-out' : 'fade-in'}`}>
            <h3>{isListing ? 'Listing NFT...' : 'List Card for Sale'}</h3>
            {isListing ? (
              <div className="listing-spinner" />
            ) : (
              <>
                <div className="price-input-container">
                  <input
                    type="number"
                    value={price}
                    onChange={handlePriceChange}
                    placeholder="Enter price in ETH"
                    className="price-input"
                    min="0.001"
                    max="10000"
                    step="0.001"
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
                    List
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {isListing && (
        <div className="processing-overlay">
          <div className="processing-content">
            <div className="listing-spinner" />
            <p>Processing your listing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingModal; 