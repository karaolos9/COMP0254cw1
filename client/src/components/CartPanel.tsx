// import React from 'react';
import { useCart } from '../context/CartContext';
import { PinataImage } from './PinataImage';
import '../styles/CartPanel.css';
import { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config';
import { Toast } from './Toast';

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SuccessPopupProps {
  onClose: () => void;
}

const SuccessPopup = ({ onClose }: SuccessPopupProps) => (
  <div className="success-popup-overlay" onClick={onClose}>
    <div className="success-popup" onClick={e => e.stopPropagation()}>
      <h3>NFT Purchased Successfully!</h3>
      <p>Your NFT has been added to your collection.</p>
      <button onClick={onClose} className="success-ok-button">OK</button>
    </div>
  </div>
);

const LoadingOverlay = () => (
  <div className="loading-overlay">
    <div className="loading-content">
      <div className="loading-spinner" />
      <p>Processing your purchase...</p>
    </div>
  </div>
);

export default function CartPanel({ isOpen, onClose }: CartPanelProps) {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);
  const total = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const itemCount = cartItems.length;

  // Check if MetaMask is available
  const isMetaMaskAvailable = typeof window !== 'undefined' && !!window.ethereum;

  const handlePurchase = async () => {
    if (!isMetaMaskAvailable) {
      setToastMessage('Please install MetaMask to purchase NFTs');
      setToastType('error');
      setShowToast(true);
      return;
    }
    
    if (cartItems.length === 0) {
      setToastMessage('Your cart is empty');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      setIsProcessing(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tradingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
        CONTRACT_ABIS.TRADING_CONTRACT,
        signer
      );

      // Purchase each NFT in the cart
      for (const item of cartItems) {
        try {
          // Validate token ID
          if (!item.tokenId) {
            throw new Error(`Token ID not found for NFT: ${item.name}`);
          }

          // Get current listing to verify status and price
          const listing = await tradingContract.listings(item.tokenId);
          
          // Initialize NFT contract first
          const nftContract = new ethers.Contract(
            CONTRACT_ADDRESSES.NFT_CONTRACT,
            CONTRACT_ABIS.NFT_CONTRACT,
            provider
          );
          
          // Log all relevant addresses
          const contractAddress = CONTRACT_ADDRESSES.TRADING_CONTRACT;
          const buyerAddress = await signer.getAddress();
          console.log('Address verification:', {
            contractAddress,
            sellerAddress: listing.seller,
            buyerAddress,
            nftOwner: await nftContract.ownerOf(item.tokenId)
          });

          // Check listing validity based on contract requirements
          if (!listing.isActive) {
            throw new Error(`NFT ${item.name} is not actively listed`);
          }
          
          if (listing.isAuction) {
            throw new Error(`NFT ${item.name} is part of an auction. Please use auction functions instead.`);
          }

          // Verify the contract owns the NFT
          const nftOwner = await nftContract.ownerOf(item.tokenId);
          if (nftOwner.toLowerCase() !== CONTRACT_ADDRESSES.TRADING_CONTRACT.toLowerCase()) {
            throw new Error(`NFT ${item.name} is not owned by the trading contract`);
          }

          // Convert price to Wei for comparison and payment
          const priceInWei = listing.price;
          
          // Verify price matches
          if (ethers.parseEther(item.price.toString()).toString() !== priceInWei.toString()) {
            throw new Error(`Price mismatch for NFT ${item.name}. Listed: ${ethers.formatEther(priceInWei)} ETH, Cart: ${item.price} ETH`);
          }

          // Log seller and payment details
          console.log('Payment verification:', {
            tokenId: item.tokenId,
            seller: listing.seller,
            price: ethers.formatEther(priceInWei),
            priceWei: priceInWei.toString(),
            isActive: listing.isActive,
            isAuction: listing.isAuction
          });

          // Check seller's balance before purchase
          const sellerBalanceBefore = await provider.getBalance(listing.seller);
          const contractBalanceBefore = await provider.getBalance(contractAddress);
          console.log('Balances before:', {
            seller: ethers.formatEther(sellerBalanceBefore),
            contract: ethers.formatEther(contractBalanceBefore)
          });

          // Attempt to buy the NFT with exact price
          console.log(`Purchasing NFT ${item.name} (ID: ${item.tokenId}) for ${ethers.formatEther(priceInWei)} ETH`);
          const tx = await tradingContract.buyCard(item.tokenId, {
            value: priceInWei,
            gasLimit: 300000 // Set explicit gas limit
          });

          console.log(`Transaction sent: ${tx.hash}`);
          const receipt = await tx.wait();
          
          // Check seller's balance after purchase
          const sellerBalanceAfter = await provider.getBalance(listing.seller);
          console.log('Seller balance after:', ethers.formatEther(sellerBalanceAfter), 'ETH');
          console.log('Balance change:', ethers.formatEther(sellerBalanceAfter - sellerBalanceBefore), 'ETH');

          console.log('Transaction receipt:', {
            hash: receipt.hash,
            status: receipt.status,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            events: receipt.logs.map(log => ({
              address: log.address,
              topics: log.topics,
              data: log.data
            }))
          });
          
          // Verify the transfer occurred
          const nftOwnerAfter = await nftContract.ownerOf(item.tokenId);
          console.log('New NFT owner:', nftOwnerAfter);
          
          console.log(`Transaction confirmed for NFT: ${item.name}`);

        } catch (itemError: any) {
          // Handle specific contract errors
          let errorMessage = `Failed to purchase ${item.name}: `;
          
          if (itemError.message.includes("InactiveListing")) {
            errorMessage += "NFT is not actively listed";
          } else if (itemError.message.includes("UseAuctionFunctions")) {
            errorMessage += "NFT is part of an auction";
          } else if (itemError.message.includes("InsufficientPayment")) {
            errorMessage += "Insufficient payment amount";
          } else if (itemError.message.includes("Contract doesn't own the NFT")) {
            errorMessage += "NFT is no longer available";
          } else {
            errorMessage += itemError.message;
          }
          
          throw new Error(errorMessage);
        }
      }

      // All purchases successful
      console.log('All NFTs purchased successfully');
      setShowSuccessPopup(true);
      clearCart();
      
    } catch (error: any) {
      console.error('Error purchasing NFTs:', error);
      
      // Handle specific error cases
      let errorMessage = '';
      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds to complete the purchase';
      } else if (error.code === 'ACTION_REJECTED' || 
                 error.message.includes("user rejected") || 
                 error.message.includes("User rejected") || 
                 error.message.includes("User denied")) {
        errorMessage = 'Transaction was cancelled by user';
      } else {
        errorMessage = error.message || 'Failed to complete purchase';
      }
      
      setToastMessage(errorMessage);
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessOk = () => {
    setShowSuccessPopup(false);
    onClose();
    window.location.reload();
  };

  return (
    <>
      {isProcessing && <LoadingOverlay />}
      {showSuccessPopup && <SuccessPopup onClose={handleSuccessOk} />}
      {isOpen && (
        <>
          <div className="cart-overlay" onClick={onClose} />
          <div className={`cart-panel ${isOpen ? 'open' : ''}`}>
            {/* <div className="cart-header">
              <h2>Shopping Cart</h2>
              <button className="close-button" onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div> */}

            <div className="cart-items">
              {cartItems.length === 0 ? (
                <div className="empty-cart">
                  <i className="fas fa-shopping-cart"></i>
                  <p>Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="cart-subheader">
                    <span className="item-count">
                      {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                    </span>
                    <button 
                      className="clear-cart-button"
                      onClick={clearCart}
                    >
                      Clear All
                    </button>
                  </div>
                  {cartItems.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="item-image">
                        <PinataImage 
                          hash={item.id}
                          alt={item.name}
                        />
                      </div>
                      <div className="item-details">
                        <h3>{item.name}</h3>
                        <p>{item.price || 'Not Listed'} {item.price ? 'ETH' : ''}</p>
                      </div>
                      <button 
                        className="remove-item"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            {cartItems.length > 0 && !showSuccessPopup && (
              <div className="cart-footer">
                <div className="cart-total">
                  <span>Total:</span>
                  <span>{total.toFixed(4)} ETH</span>
                </div>
                <button 
                  className="checkout-button"
                  onClick={handlePurchase}
                  disabled={isProcessing || !isMetaMaskAvailable}
                >
                  {!isMetaMaskAvailable ? 'Install MetaMask' : 
                   isProcessing ? 'Processing...' : 'Purchase NFTs'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onHide={() => setShowToast(false)}
        type={toastType}
      />
    </>
  );
} 