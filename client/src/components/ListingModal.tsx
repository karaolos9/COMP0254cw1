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
  const [isSuccess, setIsSuccess] = useState(false);

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
      }

      // Now list the card
      const tradingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
        CONTRACT_ABIS.TRADING_CONTRACT,
        signer
      );

      const priceInWei = ethers.parseEther(price);
      const listTx = await tradingContract.listCard(tokenId, priceInWei);
      await listTx.wait();
      
      // Show success state
      setIsSuccess(true);
      
    } catch (error: any) {
      console.error("Error listing card:", error);
      setToastMessage('Error listing card: ' + (error as Error).message);
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
      onClick={isListing ? undefined : onClose}
      style={{ cursor: isListing ? 'not-allowed' : 'pointer' }}
    >
      <div className="listing-modal-content" onClick={e => e.stopPropagation()}>
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
                    List
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {isListing && <div className="processing-overlay" />}
    </div>
  );
};

export default ListingModal; 