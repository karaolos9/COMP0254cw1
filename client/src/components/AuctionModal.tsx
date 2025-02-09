import React, { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config';

interface AuctionModalProps {
  onClose: () => void;
  tokenId: number;
  onSuccess: () => void;
  setToastMessage: (message: string) => void;
  setToastType: (type: 'success' | 'error') => void;
  setShowToast: (show: boolean) => void;
}

const AuctionModal: React.FC<AuctionModalProps> = ({ 
  onClose, 
  tokenId, 
  onSuccess,
  setToastMessage,
  setToastType,
  setShowToast
}) => {
  const [startingBid, setStartingBid] = useState<string>('');
  const [days, setDays] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleStartingBidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setStartingBid(value);
    }
  };

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*$/.test(value)) {
      setDays(value);
    }
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*$/.test(value)) {
      // Ensure hours don't exceed 23
      if (value === '' || parseInt(value) <= 23) {
        setHours(value);
      }
    }
  };

  const handleStartAuction = async () => {
    if (!window.ethereum || !startingBid) return;

    // Convert days and hours to numbers, defaulting to 0 if empty
    const daysNum = parseInt(days) || 0;
    const hoursNum = parseInt(hours) || 0;

    // Check if at least one duration field is greater than 0
    if (daysNum === 0 && hoursNum === 0) {
      setToastMessage('Duration must be greater than 0');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      setIsStarting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const currentSigner = await signer.getAddress();

      const tradingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
        CONTRACT_ABIS.TRADING_CONTRACT,
        signer
      );

      const listing = await tradingContract.listings(tokenId);
      
      if (!listing.isActive) {
        throw new Error('This NFT is not listed for sale');
      }
      
      if (listing.seller.toLowerCase() !== currentSigner.toLowerCase()) {
        throw new Error('You are not the seller of this NFT');
      }

      if (listing.isAuction) {
        throw new Error('This NFT is already in an auction');
      }

      // Calculate total duration in seconds
      const durationInSeconds = (daysNum * 24 * 60 * 60) + (hoursNum * 60 * 60);
      
      // Validate total duration
      if (durationInSeconds > 30 * 24 * 60 * 60) { // 30 days in seconds
        throw new Error('Total duration cannot exceed 30 days');
      }

      // Convert and validate starting bid
      const startingBidInWei = ethers.parseEther(startingBid);
      if (startingBidInWei <= ethers.parseEther('0')) {
        throw new Error('Starting bid must be greater than 0');
      }

      // First, cancel the current listing
      console.log('Cancelling current listing...');
      const cancelTx = await tradingContract.cancelListing(tokenId);
      await cancelTx.wait();
      console.log('Listing cancelled successfully');

      // Now start the auction
      console.log('Starting auction with params:', {
        tokenId,
        startingBidInWei: startingBidInWei.toString(),
        durationInSeconds
      });

      const tx = await tradingContract.startAuction(
        tokenId,
        startingBidInWei,
        durationInSeconds
      );

      console.log('Starting auction transaction sent:', tx.hash);
      await tx.wait();
      console.log('Auction started successfully');

      setShowSuccessPopup(true);

    } catch (error: any) {
      console.error('Error starting auction:', error);
      let errorMessage = 'Error starting auction: ';
      
      if (error.message.includes('user rejected')) {
        errorMessage += 'Transaction was rejected';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds for transaction';
      } else if (error.message.includes('UseAuctionFunctions')) {
        errorMessage += 'NFT is already part of an auction';
      } else if (error.message.includes('NotOwner')) {
        errorMessage += 'You are not the owner of this NFT';
      } else if (error.message.includes('NotApproved')) {
        errorMessage += 'Contract is not approved to handle this NFT';
      } else if (error.message.includes('InactiveListing')) {
        errorMessage += 'This NFT is not actively listed';
      } else {
        errorMessage += error.message || 'Unknown error';
      }
      
      setToastMessage(errorMessage);
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsStarting(false);
    }
  };

  const handleSuccessOk = () => {
    onSuccess();
    onClose();
    window.location.reload(); // Refresh the page
  };

  return (
    <div className="listing-modal-overlay" onClick={onClose}>
      <div className="listing-modal-content" onClick={e => e.stopPropagation()}>
        {showSuccessPopup ? (
          <div className="success-popup">
            <h3>Auction Started Successfully!</h3>
            <p>Your NFT has been put up for auction.</p>
            <button className="ok-button" onClick={handleSuccessOk}>
              OK
            </button>
          </div>
        ) : (
          <>
            <h3>Start Auction</h3>
            <div className="price-input-container">
              <input
                type="text"
                value={startingBid}
                onChange={handleStartingBidChange}
                placeholder="Enter starting bid in ETH"
                className="price-input"
              />
              <span className="eth-label">ETH</span>
            </div>
            <div className="duration-inputs">
              <div className="duration-input-container">
                <input
                  type="text"
                  value={days}
                  onChange={handleDaysChange}
                  placeholder="Days"
                  className="duration-input"
                />
                <span className="duration-label">Days</span>
              </div>
              <div className="duration-input-container">
                <input
                  type="text"
                  value={hours}
                  onChange={handleHoursChange}
                  placeholder="Hours"
                  className="duration-input"
                />
                <span className="duration-label">Hours</span>
              </div>
              <span className="duration-hint">Enter duration (max 30 days)</span>
            </div>
            <div className="listing-modal-buttons">
              <button 
                className="cancel-button"
                onClick={onClose}
                disabled={isStarting}
              >
                Cancel
              </button>
              <button 
                className="list-button"
                onClick={handleStartAuction}
                disabled={!startingBid || (!days && !hours) || isStarting}
              >
                {isStarting ? 'Starting...' : 'Start Auction'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuctionModal; 