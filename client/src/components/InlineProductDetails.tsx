import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { PinataImage } from './PinataImage';
import '../styles/InlineProductDetails.css';
import { ethers } from 'ethers';
import { Toast } from './Toast';
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

interface InlineProductDetailsProps {
  ipfsHash: string;
  metadata?: {
    name?: string;
    keyvalues?: {
      Type?: string;
    };
  };
  onClose: () => void;
  onCartOpen: () => void;
  price?: string;
  seller?: string;
  tokenId?: number;
  account?: string | null;
}

interface Bid {
  bidder: string;
  amount: bigint;
  timestamp: number;
}

export default function InlineProductDetails({ 
  ipfsHash, 
  metadata, 
  onClose, 
  onCartOpen, 
  price,
  seller,
  tokenId,
  account
}: InlineProductDetailsProps) {
  const { addToCart, cartItems, removeFromCart } = useCart();
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isListed, setIsListed] = useState(false);
  const [isAuction, setIsAuction] = useState(false);
  const [auctionEndTime, setAuctionEndTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [currentBids, setCurrentBids] = useState<Bid[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);
  const [showBidSuccessPopup, setShowBidSuccessPopup] = useState(false);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [isFinalizingAuction, setIsFinalizingAuction] = useState(false);
  const [showFinalizeSuccessPopup, setShowFinalizeSuccessPopup] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelSuccessPopup, setShowCancelSuccessPopup] = useState(false);
  const [pokemonStats, setPokemonStats] = useState<PokemonStats | null>(null);
  const [showBidOverlay, setShowBidOverlay] = useState(false);
  
  useEffect(() => {
    const checkListingStatus = async () => {
      if (!window.ethereum || !tokenId) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();
        
        const tradingContract = new ethers.Contract(
          CONTRACT_ADDRESSES.TRADING_CONTRACT,
          CONTRACT_ABIS.TRADING_CONTRACT,
          provider
        );
        
        // Get listing and auction details
        const listing = await tradingContract.listings(tokenId);
        setIsListed(listing.isActive);
        setIsAuction(listing.isAuction);
        setIsOwner(listing.seller?.toLowerCase() === signerAddress.toLowerCase());

        if (listing.isAuction) {
          const auction = await tradingContract.auctions(tokenId);
          setAuctionEndTime(Number(auction.endTime));

          // Get auction events to show bid history
          const filter = tradingContract.filters.AuctionBid(tokenId);
          const events = await tradingContract.queryFilter(filter);
          
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
          setCurrentBids(resolvedBids.sort((a, b) => b.timestamp - a.timestamp)); // Sort by most recent
        }

        // Get NFT contract to fetch Pokemon stats
        const nftContract = new ethers.Contract(
          CONTRACT_ADDRESSES.NFT_CONTRACT,
          CONTRACT_ABIS.NFT_CONTRACT,
          provider
        );

        // Fetch Pokemon stats for this token
        try {
          const stats = await nftContract.getPokemonStats(tokenId);
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
          
          setTimeLeft(
            `${days}d ${hours}h ${minutes}m ${seconds}s`
          );
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenId, auctionEndTime]);

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

  const handleAddToCart = () => {
    if (!cartItems.some(item => item.id === ipfsHash)) {
      if (!tokenId) {
        setToastMessage('Error: Token ID not found');
        setToastType('error');
        setShowToast(true);
        return;
      }
      addToCart({
        id: ipfsHash,
        image: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        name: metadata?.name || 'Pokemon Card NFT',
        price: price ? parseFloat(price) : 0,
        quantity: 1,
        tokenId: tokenId
      });
      setToastMessage('Added to cart');
      setToastType('success');
      setShowToast(true);
    } else {
      removeFromCart(ipfsHash);
      setToastMessage('Removed from cart');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    handleAddToCart();
    onClose();
    onCartOpen();
  };

  const handlePlaceBid = async () => {
    if (!window.ethereum || !bidAmount) return;

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

      const bidInWei = ethers.parseEther(bidAmount);
      
      // Get current listing and auction info
      const listing = await tradingContract.listings(tokenId);
      const auction = await tradingContract.auctions(tokenId);
      
      // Validate bid amount
      if (auction.highestBid === 0n) {
        if (bidInWei < auction.askingPrice) {
          throw new Error(`Bid must be at least ${ethers.formatEther(auction.askingPrice)} ETH`);
        }
      } else {
        const minBid = (auction.highestBid * 105n) / 100n; // 5% increment
        if (bidInWei < minBid) {
          throw new Error(`New bid must be at least 5% higher than current bid (${ethers.formatEther(minBid)} ETH)`);
        }
      }

      const tx = await tradingContract.placeBid(tokenId, { value: bidInWei });
      await tx.wait();
      
      setShowBidSuccessPopup(true);
      setToastMessage('Bid placed successfully!');
      setToastType('success');
      setShowToast(true);
      
    } catch (error: any) {
      console.error('Error placing bid:', error);
      
      let errorMessage = 'Error placing bid: ';
      
      if (error.message.includes('InactiveListing')) {
        errorMessage += 'This auction is not active';
      } else if (error.message.includes('AuctionHasEnded')) {
        errorMessage += 'This auction has ended';
      } else if (error.message.includes('NotAnAuction')) {
        errorMessage += 'This item is not part of an auction';
      } else if (error.message.includes('LowBid')) {
        errorMessage += 'Bid amount is too low';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds in your wallet';
      } else if (error.message.includes('user rejected')) {
        errorMessage += 'Transaction was rejected';
      } else {
        // If we can't identify the specific error, provide a more general message
        errorMessage += 'Failed to place bid. Please ensure your bid is at least 5% higher than the current bid';
      }
      
      setToastMessage(errorMessage);
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsPlacingBid(false);
      setShowBidOverlay(false);
    }
  };

  const handleBidSuccessOk = () => {
    setShowBidSuccessPopup(false);
    onClose();
    window.location.reload(); // Refresh the page
  };

  const handleClose = () => {
    const overlay = document.querySelector('.product-details-overlay');
    overlay?.classList.add('closing');
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBidTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
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
      
    } catch (error: any) {
      console.error('Error finalizing auction:', error);
      
      // Handle user rejection specifically
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        setToastMessage('Transaction was cancelled');
      } else {
        setToastMessage('Error finalizing auction: ' + (error.reason || error.message || 'Unknown error'));
      }
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsFinalizingAuction(false);
    }
  };

  const handleFinalizeSuccessOk = () => {
    setShowFinalizeSuccessPopup(false);
    onClose();
    window.location.reload(); // Refresh the page to update the NFT status
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
        onClick={isPlacingBid || isFinalizingAuction || isCancelling ? undefined : () => {
          onClose();
          if (showFinalizeSuccessPopup) {
            window.location.reload();
          }
        }}
        style={{ cursor: isPlacingBid || isFinalizingAuction || isCancelling ? 'not-allowed' : 'pointer' }}
      >
        <div className="product-details-content" onClick={e => e.stopPropagation()}>
          {isCancelling && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Cancelling listing...</p>
            </div>
          )}
          <button className="close-button" onClick={onClose}>×</button>
          
          <div className="product-details-scroll-container">
            {/* Main Content Section */}
            <div className="product-details-main">
              <div className="product-details-grid">
                <div className="product-image">
                  <PinataImage hash={ipfsHash} alt={metadata?.name || 'Pokemon Card'} />
                </div>
                
                <div className="product-info">
                  <h2>{metadata?.name || 'Pokemon Card NFT'}</h2>
                  <div className="type-badge-container">
                    <span className={`type-badge ${(metadata?.keyvalues?.Type || '').toLowerCase()}`}>
                      {metadata?.keyvalues?.Type || 'Type'}
                    </span>
                  </div>
                  <div className="product-price">
                    <h3>Price:</h3>
                    <span>{price || 'Not Listed'} {price ? 'ETH' : ''}</span>
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
                        <span>{seller ? formatAddress(seller) : 'Unknown'}</span>
                      </div>
                      <div className="metadata-item">
                        <label>Contract</label>
                        <span>{formatAddress(CONTRACT_ADDRESSES.NFT_CONTRACT)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="action-buttons">
                    {isOwner || account?.toLowerCase() === seller?.toLowerCase() ? (
                      <>
                        <button
                          className="cancel-listing-button"
                          onClick={handleCancelListing}
                          disabled={isAuction || isCancelling}
                          title={isAuction ? "Cannot cancel an active auction" : "Cancel listing"}
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
                        <button 
                          className="view-auction-button"
                          onClick={() => {
                            const auctionSection = document.querySelector('.auction-section');
                            auctionSection?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          disabled={!isAuction}
                        >
                          <i className="fas fa-gavel"></i>
                          View Auction
                        </button>
                      </>
                    ) : (
                      <>
                        {isListed && !isAuction && (
                          <>
                            <button 
                              className={`cart-button ${cartItems.some(item => item.id === ipfsHash) ? 'in-cart' : ''}`}
                              onClick={handleAddToCart}
                              disabled={isAuction}
                            >
                              <i className="fas fa-shopping-cart"></i>
                            </button>
                            <button
                              className="buy-now-button"
                              onClick={handleBuyNow}
                              disabled={isAuction}
                            >
                              Buy Now
                            </button>
                          </>
                        )}
                        
                        {isAuction && (
                          <button 
                            className="view-auction-button"
                            onClick={() => {
                              const auctionSection = document.querySelector('.auction-section');
                              auctionSection?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            disabled={!isAuction}
                          >
                            <i className="fas fa-gavel"></i>
                            View Auction
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Auction Section */}
            {isAuction && (
              <div className={`auction-section ${isAuction ? 'active' : ''}`}>
                <div className="auction-header">
                  <h3>Auction Details</h3>
                  <span className="auction-countdown">{timeLeft}</span>
                </div>
                <div className="auction-content">
                  <div className="current-bids">
                    <h4>Bid History</h4>
                    {currentBids.length > 0 ? (
                      <div className="bids-list">
                        {currentBids.map((bid, index) => (
                          <div key={index} className="bid-item">
                            <span className="bid-address">{formatAddress(bid.bidder)}</span>
                            <span className="bid-amount">{ethers.formatEther(bid.amount)} ETH</span>
                            <span className="bid-time">{formatBidTime(bid.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-bids">No bids yet</p>
                    )}
                  </div>
                  {!isOwner && auctionEndTime > Math.floor(Date.now() / 1000) && !showFinalizeSuccessPopup && (
                    <div className="place-bid">
                      {showBidSuccessPopup ? (
                        <div className="success-popup-overlay" onClick={handleBidSuccessOk}>
                          <div className="success-popup" onClick={e => e.stopPropagation()}>
                            <h3>Bid Placed Successfully!</h3>
                            <p>Your bid has been placed on this NFT.</p>
                            <button className="ok-button" onClick={handleBidSuccessOk}>
                              OK
                            </button>
                          </div>
                        </div>
                      ) : isPlacingBid ? (
                        <div className="loading-container">
                          <div className="loading-spinner"></div>
                          <p>Placing your bid...</p>
                        </div>
                      ) : (
                        <>
                          <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            placeholder="Enter bid amount in ETH"
                            min="0.1"
                            step="0.01"
                            disabled={isPlacingBid}
                          />
                          <button 
                            className="place-bid-button"
                            onClick={handlePlaceBid}
                            disabled={!bidAmount || Number(bidAmount) <= 0 || isPlacingBid}
                          >
                            {isPlacingBid ? 'Placing Bid...' : 'Place Bid'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {auctionEndTime <= Math.floor(Date.now() / 1000) && (isOwner || account?.toLowerCase() === seller?.toLowerCase()) && (
                    <div className="finalize-auction">
                      {showFinalizeSuccessPopup ? (
                        <div className="success-popup-overlay">
                          <div className="success-popup">
                            <h3>Auction Finalized Successfully!</h3>
                            <p>The auction has been finalized and assets have been transferred.</p>
                            <button className="ok-button" onClick={handleFinalizeSuccessOk}>
                              OK
                            </button>
                          </div>
                        </div>
                      ) : isFinalizingAuction ? (
                        <div className="loading-container">
                          <div className="loading-spinner"></div>
                          <p>Finalizing auction...</p>
                        </div>
                      ) : (
                        <button 
                          className="finalize-auction-button"
                          onClick={handleFinalizeAuction}
                          disabled={isFinalizingAuction}
                        >
                          Finalize Auction
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onHide={() => setShowToast(false)}
        type={toastType}
      />
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
      {(isPlacingBid || isFinalizingAuction || isCancelling) && (
        <div className="bid-processing-overlay">
          <div className="processing-content">
            <div className="listing-spinner" />
            <p>{isPlacingBid ? 'Processing your bid...' : isFinalizingAuction ? 'Finalizing auction...' : 'Cancelling listing...'}</p>
          </div>
        </div>
      )}
    </>
  );
} 