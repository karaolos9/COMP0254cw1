import React, { useState, useEffect } from 'react';
import { PinataImage } from './PinataImage';
import { PinataItem } from '../types';
import ListingModal from './ListingModal';
import AuctionModal from './AuctionModal';
import { Toast } from './Toast';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config';

interface ProfileCardDetailsProps {
  ipfsHash: string;
  metadata?: {
    name?: string;
    keyvalues?: {
      Type?: string;
      Rarity?: string;
      Generation?: string;
      Move1?: string;
      Move2?: string;
    };
  };
  onClose: () => void;
  account: string | null;
}

const ProfileCardDetails: React.FC<ProfileCardDetailsProps> = ({
  ipfsHash,
  metadata,
  onClose,
  account
}) => {
  const [showListingModal, setShowListingModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);
  const [isListed, setIsListed] = useState(false);
  const [isAuction, setIsAuction] = useState(false);
  const [tokenId, setTokenId] = useState<number | null>(null);

  useEffect(() => {
    const checkListingStatus = async () => {
      if (!window.ethereum) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // First get the tokenId for this IPFS hash
        const nftContract = new ethers.Contract(
          CONTRACT_ADDRESSES.NFT_CONTRACT,
          CONTRACT_ABIS.NFT_CONTRACT,
          provider
        );
        
        // Get total tokens to iterate through
        const totalTokens = await nftContract.cardIdCounter();
        
        // Find the token ID that matches our IPFS hash
        for (let i = 1; i <= totalTokens; i++) {
          const uri = await nftContract.tokenURI(i);
          const cleanUri = uri.replace('ipfs://', '');
          if (cleanUri === ipfsHash) {
            setTokenId(i);
            
            // Check if this token is listed
            const tradingContract = new ethers.Contract(
              CONTRACT_ADDRESSES.TRADING_CONTRACT,
              CONTRACT_ABIS.TRADING_CONTRACT,
              provider
            );
            
            const listing = await tradingContract.listings(i);
            setIsListed(listing.isActive);
            setIsAuction(listing.isAuction);
            break;
          }
        }
      } catch (error) {
        console.error('Error checking listing status:', error);
      }
    };

    checkListingStatus();
  }, [ipfsHash]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="product-details-overlay" onClick={onClose}>
      <div className="product-details-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <div className="product-details-grid">
          <div className="product-image">
            <PinataImage hash={ipfsHash} alt="NFT Item" />
          </div>
          <div className="product-info">
            <h2>{metadata?.name || 'Pokemon Card NFT'}</h2>
            <div className="type-badge-container">
              <span className={`type-badge ${metadata?.keyvalues?.Type?.toLowerCase()}`}>
                {metadata?.keyvalues?.Type || 'Type'}
              </span>
            </div>
            <div className="product-price">
              <h3>Price:</h3>
              <span>{isListed ? '0.001 ETH' : 'Not Listed'}</span>
            </div>
            <div className="metadata-section">
              <h3>Details</h3>
              <div className="metadata-grid">
                <div className="metadata-item">
                  <label>Owner</label>
                  <span>{account ? formatAddress(account) : 'Unknown'}</span>
                </div>
                <div className="metadata-item">
                  <label>Rarity</label>
                  <span>{metadata?.keyvalues?.Rarity || 'Common'}</span>
                </div>
                <div className="metadata-item">
                  <label>Generation</label>
                  <span>{metadata?.keyvalues?.Generation || 'Unknown'}</span>
                </div>
                <div className="metadata-item">
                  <label>Move 1</label>
                  <span>{metadata?.keyvalues?.Move1 || '-'}</span>
                </div>
                <div className="metadata-item">
                  <label>Move 2</label>
                  <span>{metadata?.keyvalues?.Move2 || '-'}</span>
                </div>
                <div className="metadata-item">
                  <label>Token ID</label>
                  <span>{tokenId ? `#${tokenId}` : ipfsHash.slice(0, 8)}</span>
                </div>
              </div>
            </div>
            <div className="action-buttons">
              <button 
                className="list-button"
                onClick={() => setShowListingModal(true)}
                disabled={isListed}
              >
                <i className="fas fa-tag"></i>
                {isListed ? 'Listed' : 'List for Sale'}
              </button>
              {isListed && (
                <button 
                  className="auction-button"
                  onClick={() => setShowAuctionModal(true)}
                  disabled={isAuction}
                >
                  <i className="fas fa-gavel"></i>
                  {isAuction ? 'In Auction' : 'Start Auction'}
                </button>
              )}
            </div>
          </div>
        </div>
        {showListingModal && (
          <ListingModal
            ipfsHash={ipfsHash}
            onClose={() => setShowListingModal(false)}
            onSuccess={() => {
              setShowListingModal(false);
              onClose();
            }}
            setToastMessage={setToastMessage}
            setToastType={setToastType}
            setShowToast={setShowToast}
          />
        )}
        {showAuctionModal && tokenId && (
          <AuctionModal
            tokenId={tokenId}
            onClose={() => setShowAuctionModal(false)}
            onSuccess={() => {
              setShowAuctionModal(false);
              onClose();
            }}
            setToastMessage={setToastMessage}
            setToastType={setToastType}
            setShowToast={setShowToast}
          />
        )}
        <Toast 
          message={toastMessage}
          isVisible={showToast}
          onHide={() => setShowToast(false)}
          type={toastType}
        />
      </div>
    </div>
  );
};

export default ProfileCardDetails; 