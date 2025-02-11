import React, { useState, useEffect } from 'react';
import { PinataImage } from './PinataImage';
import { PinataItem } from '../types';
import ListingModal from './ListingModal';
import AuctionModal from './AuctionModal';
import { Toast } from './Toast';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config';

  // Add Pokemon type mapping
  const pokemonTypes = [
    'NORMAL', 'FIRE', 'WATER', 'ELECTRIC', 'GRASS', 'ICE',
    'FIGHTING', 'POISON', 'GROUND', 'FLYING', 'PSYCHIC', 'BUG',
    'ROCK', 'GHOST', 'DRAGON', 'DARK', 'STEEL', 'FAIRY', 'LIGHT'
  ];

// Add interface for Pokemon stats
interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  special: number;
  pokemonType: number;
}

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
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelSuccessPopup, setShowCancelSuccessPopup] = useState(false);
  // Add new state for Pokemon stats
  const [pokemonStats, setPokemonStats] = useState<PokemonStats | null>(null);

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
            
            // Fetch Pokemon stats for this token
            try {
              const stats = await nftContract.getPokemonStats(i);
              setPokemonStats({
                hp: Number(stats.hp),
                attack: Number(stats.attack),
                defense: Number(stats.defense),
                speed: Number(stats.speed),
                special: Number(stats.special),
                pokemonType: Number(stats.pokemonType)
              });
            } catch (error) {
              console.error('Error fetching Pokemon stats:', error);
            }
            
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

  const handleCancelListing = async () => {
    if (!window.ethereum || !tokenId) return;

    setIsCancelling(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tradingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
        CONTRACT_ABIS.TRADING_CONTRACT,
        signer
      );

      const tx = await tradingContract.cancelListing(tokenId);
      await tx.wait();

      setToastMessage('Listing cancelled successfully');
      setToastType('success');
      setShowToast(true);
      setShowCancelSuccessPopup(true);
      
    } catch (error) {
      console.error('Error cancelling listing:', error);
      setToastMessage('Error cancelling listing');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelSuccessOk = () => {
    setShowCancelSuccessPopup(false);
    onClose();
    window.location.reload();
  };



  return (
    <>
      <div 
        className="product-details-overlay" 
        onClick={isCancelling ? undefined : onClose}
        style={{ cursor: isCancelling ? 'not-allowed' : 'pointer' }}
      >
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
                    <label>HP</label>
                    <span>{pokemonStats?.hp || 'Loading...'}</span>
                  </div>
                  <div className="metadata-item">
                    <label>Attack</label>
                    <span>{pokemonStats?.attack || 'Loading...'}</span>
                  </div>
                  <div className="metadata-item">
                    <label>Defense</label>
                    <span>{pokemonStats?.defense || 'Loading...'}</span>
                  </div>
                  <div className="metadata-item">
                    <label>Speed</label>
                    <span>{pokemonStats?.speed || 'Loading...'}</span>
                  </div>
                  <div className="metadata-item">
                    <label>Special</label>
                    <span>{pokemonStats?.special || 'Loading...'}</span>
                  </div>
                </div>
              </div>
              <div className="action-buttons">
                {/* List/Cancel button group */}
                {isListed ? (
                  <button 
                    className="cancel-listing-button"
                    onClick={handleCancelListing}
                    disabled={isCancelling || isAuction}
                  >
                    {isCancelling ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-times"></i>
                        Cancel Listing
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    className="list-button"
                    onClick={() => setShowListingModal(true)}
                    disabled={isAuction}
                  >
                    <i className="fas fa-tag"></i>
                    List for Sale
                  </button>
                )}

                {/* Auction button */}
                {isAuction ? (
                  <button 
                    className="view-auction-button"
                    onClick={() => setShowAuctionModal(true)}
                  >
                    <i className="fas fa-gavel"></i>
                    View Auction
                  </button>
                ) : (
                  <button 
                    className="auction-button"
                    onClick={() => setShowAuctionModal(true)}
                  >
                    <i className="fas fa-gavel"></i>
                    Start Auction
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
        </div>
      </div>

      {showCancelSuccessPopup && (
        <div className="success-popup-overlay" onClick={handleCancelSuccessOk}>
          <div className="success-popup" onClick={e => e.stopPropagation()}>
            <h3>Listing Cancelled Successfully!</h3>
            <p>Your NFT listing has been cancelled.</p>
            <button className="ok-button" onClick={handleCancelSuccessOk}>
              OK
            </button>
          </div>
        </div>
      )}

      {isCancelling && <div className="processing-overlay" />}

      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onHide={() => setShowToast(false)}
        type={toastType}
      />
    </>
  );
};

export default ProfileCardDetails; 