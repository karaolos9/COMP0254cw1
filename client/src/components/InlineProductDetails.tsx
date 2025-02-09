import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { PinataImage } from './PinataImage';
import '../styles/InlineProductDetails.css';
import { ethers } from 'ethers';
import { Toast } from './Toast';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config';

interface InlineProductDetailsProps {
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
  onCartOpen: () => void;
  price?: string;
  seller?: string;
  tokenId?: number;
}

interface Bid {
  address: string;
  amount: number;
  timestamp: Date;
}

export default function InlineProductDetails({ 
  ipfsHash, 
  metadata, 
  onClose, 
  onCartOpen, 
  price,
  seller,
  tokenId
}: InlineProductDetailsProps) {
  const { addToCart, cartItems, removeFromCart } = useCart();
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isListed, setIsListed] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);
  
  // Mock bids data - replace with real data later
  const [bids] = useState<Bid[]>([
    {
      address: '0x1234...5678',
      amount: 0.15,
      timestamp: new Date('2024-03-10T10:00:00')
    },
    {
      address: '0x8765...4321',
      amount: 0.12,
      timestamp: new Date('2024-03-09T15:30:00')
    }
  ]);

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
        
        const listing = await tradingContract.listings(tokenId);
        setIsListed(listing.isActive);
        setIsOwner(seller?.toLowerCase() === signerAddress.toLowerCase());
      } catch (error) {
        console.error('Error checking listing status:', error);
      }
    };

    checkListingStatus();
  }, [tokenId, seller]);

  const handleCancelListing = async () => {
    if (!window.ethereum || !tokenId) return;

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
      
      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
        window.location.reload(); // Refresh the page to update listings
      }, 2000);
    } catch (error) {
      console.error('Error cancelling listing:', error);
      setToastMessage('Error cancelling listing');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleAddToCart = () => {
    if (!cartItems.some(item => item.id === ipfsHash)) {
      addToCart({
        id: ipfsHash,
        image: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        name: metadata?.name || 'Pokemon Card NFT',
        price: price ? parseFloat(price) : 0,
        quantity: 1
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

  const handleBuyNow = () => {
    handleAddToCart();
    onClose();
    onCartOpen();
  };

  const handlePlaceBid = () => {
    // Implement bid placement logic here
    console.log('Placing bid:', bidAmount);
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

  return (
    <>
      <div className="product-details-overlay" onClick={handleClose}>
        <div className="product-details-content" onClick={e => e.stopPropagation()}>
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
                        <label>Owner</label>
                        <span>{seller ? formatAddress(seller) : 'Unknown'}</span>
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
                    {isOwner ? (
                      <>
                        <button 
                          className="cancel-listing-button"
                          onClick={handleCancelListing}
                        >
                          <i className="fas fa-times"></i>
                          Cancel Listing
                        </button>
                        <button 
                          className="view-auction-button"
                          onClick={() => {
                            const auctionSection = document.querySelector('.auction-section');
                            auctionSection?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <i className="fas fa-gavel"></i>
                          View Auction
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="add-to-cart-button"
                          onClick={handleAddToCart}
                        >
                          {cartItems.some(item => item.id === ipfsHash) ? 'Remove from Cart' : 'Add to Cart'}
                        </button>
                        <button 
                          className="buy-now-button"
                          onClick={handleBuyNow}
                        >
                          Buy Now
                        </button>
                        <button 
                          className="view-auction-button"
                          onClick={() => {
                            const auctionSection = document.querySelector('.auction-section');
                            auctionSection?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <i className="fas fa-gavel"></i>
                          View Auction
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Auction Section */}
            <div className="auction-section">
              <div className="auction-content">
                <h3>Auction Details</h3>
                <div className="current-bids">
                  <h4>Current Bids</h4>
                  {bids.length > 0 ? (
                    <div className="bids-list">
                      {bids.map((bid, index) => (
                        <div key={index} className="bid-item">
                          <span className="bid-address">{bid.address}</span>
                          <span className="bid-amount">{bid.amount} ETH</span>
                          <span className="bid-time">
                            {bid.timestamp.toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-bids">No bids yet</p>
                  )}
                </div>
                <div className="place-bid">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Enter bid amount in ETH"
                    min="0.1"
                    step="0.01"
                  />
                  <button 
                    className="place-bid-button"
                    onClick={handlePlaceBid}
                    disabled={!bidAmount || Number(bidAmount) <= 0}
                  >
                    Place Bid
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onHide={() => setShowToast(false)}
        type={toastType}
      />
    </>
  );
} 