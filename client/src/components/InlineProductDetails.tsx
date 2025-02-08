import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { PinataImage } from './PinataImage';
import '../styles/InlineProductDetails.css';

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
}

interface Bid {
  address: string;
  amount: number;
  timestamp: Date;
}

export default function InlineProductDetails({ ipfsHash, metadata, onClose, onCartOpen }: InlineProductDetailsProps) {
  const { addToCart, cartItems, removeFromCart } = useCart();
  const [bidAmount, setBidAmount] = useState<string>('');
  
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

  const handleAddToCart = () => {
    if (!cartItems.some(item => item.id === ipfsHash)) {
      addToCart({
        id: ipfsHash,
        image: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        name: metadata?.name || 'Pokemon Card NFT',
        price: 0.1,
        quantity: 1
      });
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

  return (
    <div className="product-details-overlay">
      <div className="product-details-container">
        <button className="close-details" onClick={handleClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className="product-details-content">
          <div className="product-image">
            <PinataImage hash={ipfsHash} alt={metadata?.name || 'Pokemon Card'} />
          </div>
          
          <div className="product-info">
            <h2>{metadata?.name || 'Pokemon Card NFT'}</h2>
            <div className="product-type">
              <span className={`type-badge ${(metadata?.keyvalues?.Type || '').toLowerCase()}`}>
                {metadata?.keyvalues?.Type || 'Type'}
              </span>
            </div>
            <div className="product-price">
              <h3>Price:</h3>
              <span>0.1 ETH</span>
            </div>
            <div className="product-description">
              <h3>Description:</h3>
              <p>A rare Pokemon NFT card featuring {metadata?.name}. This digital collectible is perfect for Pokemon enthusiasts and NFT collectors alike.</p>
            </div>
            <div className="product-actions">
              <button 
                className="add-to-cart-button"
                onClick={handleAddToCart}
              >
                {cartItems.some(item => item.id === ipfsHash) ? (
                  <span onClick={() => removeFromCart(ipfsHash)}>Remove from Cart</span>
                ) : (
                  'Add to Cart'
                )}
              </button>
              <button 
                className="buy-now-button"
                onClick={handleBuyNow}
              >
                Buy Now
              </button>
              <button 
                className="auction-button"
                onClick={() => {
                  const auctionSection = document.querySelector('.auction-section');
                  auctionSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                View Auction
              </button>
            </div>
          </div>
        </div>

        <div className="auction-section">
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
  );
} 