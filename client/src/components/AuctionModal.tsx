import React, { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config';

interface ContractTransaction extends ethers.ContractTransaction {
  hash: string;
  wait(): Promise<ethers.TransactionReceipt>;
}

interface NFTContract {
  setApprovalForAll(operator: string, approved: boolean): Promise<ContractTransaction>;
  isApprovedForAll(owner: string, operator: string): Promise<boolean>;
  ownerOf(tokenId: ethers.BigNumberish): Promise<string>;
  connect(signer: ethers.Signer): NFTContract;
}

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
  const [isSuccess, setIsSuccess] = useState(false);

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
    try {
      // Add validation before starting the auction process
      const bidNum = parseFloat(startingBid);
      if (isNaN(bidNum)) {
        throw new Error('Please enter a valid starting auction price');
      }
      if (bidNum < 0.001) {
        throw new Error('Starting auction price must be at least 0.001 ETH');
      }
      if (bidNum > 10000) {
        throw new Error('Starting auction price cannot exceed 10000 ETH');
      }

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

      setIsStarting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const currentSigner = await signer.getAddress();

      // First check NFT contract approval
      const nftContract = new ethers.Contract(
        CONTRACT_ADDRESSES.NFT_CONTRACT,
        CONTRACT_ABIS.NFT_CONTRACT,
        provider
      ) as unknown as NFTContract;

      // Check ownership and seller status
      const owner = await nftContract.ownerOf(tokenId);
      console.log('Owner:', owner);
      console.log('Current signer:', currentSigner);
      
      const tradingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
        CONTRACT_ABIS.TRADING_CONTRACT,
        provider
      );
      const listing = await tradingContract.listings(tokenId);
      const isSeller = listing.seller?.toLowerCase() === currentSigner.toLowerCase();
      
      if (owner.toLowerCase() !== currentSigner.toLowerCase() && !isSeller) {
        throw new Error('You must be the owner or seller of this NFT');
      }

      // Check if approved for all
      const isApprovedForAll = await nftContract.isApprovedForAll(
        currentSigner,
        CONTRACT_ADDRESSES.TRADING_CONTRACT
      );
      
      console.log('Is approved for all:', isApprovedForAll);
      
      if (!isApprovedForAll) {
        console.log('Approving trading contract...');
        try {
          const nftContractWithSigner = nftContract.connect(signer);
          const approveTx = await nftContractWithSigner.setApprovalForAll(CONTRACT_ADDRESSES.TRADING_CONTRACT, true);
          console.log('Approval transaction sent:', approveTx.hash);
          await approveTx.wait();
          console.log('Approval confirmed');
        } catch (approvalError: any) {
          console.error('Error during approval:', approvalError);
          throw new Error(`Approval failed: ${approvalError.message}`);
        }
      }

      // Get trading contract with signer for transactions
      const tradingContractWithSigner = new ethers.Contract(
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
        CONTRACT_ABIS.TRADING_CONTRACT,
        signer
      );

      // Check if the NFT is currently listed
      if (listing.isActive) {
        // If listed, verify ownership
        if (listing.seller.toLowerCase() !== currentSigner.toLowerCase()) {
          throw new Error('You are not the seller of this NFT');
        }

        if (listing.isAuction) {
          throw new Error('This NFT is already in an auction');
        }

        // Cancel the current listing before starting auction
        console.log('Cancelling current listing...');
        const cancelTx = await tradingContractWithSigner.cancelFixedPriceListing(tokenId);
        console.log('Cancel transaction sent:', cancelTx.hash);
        await cancelTx.wait();
        console.log('Listing cancelled successfully');
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

      // Start the auction
      console.log('Starting auction with params:', {
        tokenId,
        startingBidInWei: startingBidInWei.toString(),
        durationInSeconds
      });

      const tx = await tradingContractWithSigner.startAuction(
        tokenId,
        startingBidInWei,
        durationInSeconds
      );

      console.log('Starting auction transaction sent:', tx.hash);
      await tx.wait();
      console.log('Auction started successfully');

      setIsSuccess(true);

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
      } else if (error.message.includes('Approval failed')) {
        errorMessage += error.message;
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
    <div 
      className="listing-modal-overlay" 
      onClick={isSuccess ? handleSuccessOk : isStarting ? undefined : onClose}
      style={{ cursor: isStarting ? 'not-allowed' : 'pointer' }}
    >
      <div className="listing-modal-content" onClick={isSuccess ? handleSuccessOk : e => e.stopPropagation()}>
        {isSuccess ? (
          <div className="listing-success">
            <i className="fas fa-check-circle"></i>
            <h3>Auction Started Successfully!</h3>
            <button className="success-ok-button" onClick={handleSuccessOk}>
              OK
            </button>
          </div>
        ) : (
          <div className={`modal-content-container ${isStarting ? 'fade-out' : 'fade-in'}`}>
            <h3>{isStarting ? 'Starting Auction...' : 'Start Auction'}</h3>
            {isStarting ? (
              <div className="listing-spinner" />
            ) : (
              <>
                <div className="price-input-container">
                  <input
                    type="number"
                    value={startingBid}
                    onChange={handleStartingBidChange}
                    placeholder="Enter starting bid in ETH"
                    className="price-input"
                    min="0.001"
                    max="10000"
                    step="0.001"
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
        )}
      </div>
      {isStarting && (
        <div className="processing-overlay">
          <div className="processing-content">
            <div className="listing-spinner" />
            <p>Processing your auction...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionModal; 