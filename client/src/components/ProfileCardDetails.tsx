import React, { useState, useEffect, useRef } from 'react';
import { PinataImage } from './PinataImage';
import { PinataItem } from '../types';
import ListingModal from './ListingModal';
import AuctionModal from './AuctionModal';
import { Toast } from './Toast';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config';
import '../styles/ProfileCardDetails.css';

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

interface Bid {
  bidder: string;
  amount: bigint;
  timestamp: number;
}

interface ProfileCardDetailsProps {
  ipfsHash: string;
  metadata?: {
    name?: string;
    keyvalues?: {
      Type?: string;
    };
  };
  onClose: () => void;
  account: string | null;
  seller?: string;
}

const ProfileCardDetails: React.FC<ProfileCardDetailsProps> = ({
  ipfsHash,
  metadata,
  onClose,
  account,
  seller
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
  const [pokemonStats, setPokemonStats] = useState<PokemonStats | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [auctionEndTime, setAuctionEndTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [currentBids, setCurrentBids] = useState<Bid[]>([]);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [showBidSuccessPopup, setShowBidSuccessPopup] = useState(false);
  const [isFinalizingAuction, setIsFinalizingAuction] = useState(false);
  const [showFinalizeSuccessPopup, setShowFinalizeSuccessPopup] = useState(false);
  const [showBidOverlay, setShowBidOverlay] = useState(false);
  const auctionSectionRef = useRef<HTMLDivElement>(null);

  // Add console log to track rendering
  console.log('Rendering ProfileCardDetails with isAuction:', isAuction);

  useEffect(() => {
    const checkListingStatus = async () => {
      if (!window.ethereum) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();
        
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
            console.log('Found matching token ID:', i);
            
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
            console.log('Listing status:', {
              isActive: listing.isActive,
              isAuction: listing.isAuction,
              seller: listing.seller
            });
            
            setIsListed(listing.isActive);
            setIsAuction(listing.isAuction);

            if (listing.isAuction) {
              console.log('This is an auction');
              const auction = await tradingContract.auctions(i);
              const endTime = Number(auction.endTime);
              console.log('Auction end time:', new Date(endTime * 1000).toLocaleString());
              setAuctionEndTime(endTime);

              // Get auction events to show bid history
              const filter = tradingContract.filters.AuctionBid(i);
              const events = await tradingContract.queryFilter(filter);
              console.log('Number of bids:', events.length);
              
              const bids = events
                .filter((event): event is ethers.Log & { args: any[] } => 'args' in event)
                .map(async event => {
                  const block = await event.getBlock();
                  return {
                    bidder: event.args[1], // bidder address
                    amount: event.args[2], // bid amount
                    timestamp: block.timestamp
                  };
                });

              const resolvedBids = await Promise.all(bids);
              const sortedBids = resolvedBids.sort((a, b) => b.timestamp - a.timestamp);
              console.log('Sorted bids:', sortedBids);
              setCurrentBids(sortedBids); // Sort by most recent
            }
            break;
          }
        }
      } catch (error) {
        console.error('Error checking listing status:', error);
      }
    };

    checkListingStatus();

    // Update countdown timer every second
    const timer = setInterval(() => {
      if (auctionEndTime) {
        const now = Math.floor(Date.now() / 1000);
        const remaining = auctionEndTime - now;
        
        if (remaining <= 0) {
          setTimeLeft('Auction ended');
        } else {
          const days = Math.floor(remaining / (24 * 60 * 60));
          const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
          const minutes = Math.floor((remaining % (60 * 60)) / 60);
          const seconds = remaining % 60;
          
          const timeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
          console.log('Time remaining:', timeString);
          setTimeLeft(timeString);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [ipfsHash, auctionEndTime]);

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

      const tx = await tradingContract.cancelFixedPriceListing(tokenId);
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

  const handlePlaceBid = async () => {
    if (!window.ethereum || !bidAmount || !tokenId) return;

    try {
      setIsPlacingBid(true);
      setShowBidOverlay(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tradingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
        CONTRACT_ABIS.TRADING_CONTRACT,
        signer
      );

      const bidAmountWei = ethers.parseEther(bidAmount);
      const tx = await tradingContract.placeBid(tokenId, { value: bidAmountWei });
      await tx.wait();

      setToastMessage('Bid placed successfully');
      setToastType('success');
      setShowToast(true);
      setShowBidSuccessPopup(true);
      setBidAmount('');
      
    } catch (error) {
      console.error('Error placing bid:', error);
      setToastMessage('Error placing bid');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsPlacingBid(false);
      setShowBidOverlay(false);
    }
  };

  const handleFinalizeAuction = async () => {
    if (!window.ethereum || !tokenId) return;

    setIsFinalizingAuction(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tradingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
        CONTRACT_ABIS.TRADING_CONTRACT,
        signer
      );

      const tx = await tradingContract.finalizeAuction(tokenId);
      await tx.wait();

      setToastMessage('Auction finalized successfully');
      setToastType('success');
      setShowToast(true);
      setShowFinalizeSuccessPopup(true);
      
    } catch (error) {
      console.error('Error finalizing auction:', error);
      setToastMessage('Error finalizing auction');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsFinalizingAuction(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBidTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const handleCancelSuccessOk = () => {
    setShowCancelSuccessPopup(false);
    onClose();
    window.location.reload();
  };

  const scrollToAuction = () => {
    auctionSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div 
        className="product-details-overlay" 
        onClick={isCancelling ? undefined : onClose}
        style={{ cursor: isCancelling ? 'not-allowed' : 'pointer' }}
      >
        <div 
          className="product-details-content" 
          onClick={e => e.stopPropagation()}
          style={{ 
            maxHeight: '90vh',
            overflow: 'hidden',
            background: 'white',
            width: '90%',
            maxWidth: '1200px',
            borderRadius: '12px',
            position: 'relative'
          }}
        >
          <button className="close-button" onClick={onClose}>×</button>
          <div 
            className="product-details-scroll-container"
            style={{ 
              height: '100%',
              overflowY: 'auto',
              padding: '20px'
            }}
          >
            
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
                    <div className="metadata-item">
                      <label>Token ID</label>
                      <span>{tokenId ? `#${tokenId}` : ipfsHash.slice(0, 8)}</span>
                    </div>
                    <div className="metadata-item">
                      <label>Owner</label>
                      <span>{account ? formatAddress(account) : 'Unknown'}</span>
                    </div>
                    <div className="metadata-item">
                      <label>Contract</label>
                      <span>{formatAddress(CONTRACT_ADDRESSES.NFT_CONTRACT)}</span>
                    </div>
                  </div>
                </div>
                <div className="action-buttons">
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

                  {isAuction ? (
                    <button 
                      className="view-auction-button"
                      onClick={scrollToAuction}
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

            {/* Auction Section with ref */}
            <div ref={auctionSectionRef}>
              {isAuction ? (
                <div>
                  <div className="auction-header">
                    <h3>Auction Details</h3>
                    <div className="auction-countdown">
                      Time Remaining: {timeLeft}
                    </div>
                  </div>

                  <div className="current-bids">
                    <h4>Current Bids ({currentBids.length})</h4>
                    {currentBids.length > 0 ? (
                      <div className="bids-list">
                        {currentBids.map((bid, index) => (
                          <div key={index} className="bid-item">
                            <span className="bid-address">{formatAddress(bid.bidder.toString())}</span>
                            <span className="bid-amount">{ethers.formatEther(bid.amount)} ETH</span>
                            <span className="bid-time">{formatBidTime(bid.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-bids">No bids yet</div>
                    )}
                  </div>

                  {timeLeft !== 'Auction ended' ? (
                    <div className="place-bid">
                      <input
                        type="number"
                        step="0.001"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder="Enter bid amount in ETH"
                        disabled={isPlacingBid}
                      />
                      <button
                        className="place-bid-button"
                        onClick={handlePlaceBid}
                        disabled={!bidAmount || isPlacingBid}
                      >
                        {isPlacingBid ? 'Placing Bid...' : 'Place Bid'}
                      </button>
                    </div>
                  ) : (
                    <div className="finalize-auction">
                      <button
                        className="finalize-auction-button"
                        onClick={handleFinalizeAuction}
                        disabled={isFinalizingAuction}
                      >
                        {isFinalizingAuction ? 'Finalizing...' : 'Finalize Auction'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ 
                  padding: '20px',
                  background: '#ffebee',
                  margin: '20px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  Not an auction (isAuction is false)
                </div>
              )}
            </div>
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

      {showBidOverlay && (
        <div className="bid-processing-overlay">
          <div className="processing-content">
            <div className="listing-spinner"></div>
            <p>Processing your bid...</p>
          </div>
        </div>
      )}

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