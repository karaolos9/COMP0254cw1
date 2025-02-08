// import React from 'react';
import { useCart } from '../context/CartContext';
import { PinataImage } from './PinataImage';
import '../styles/CartPanel.css';

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartPanel({ isOpen, onClose }: CartPanelProps) {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const total = cartItems.reduce((sum, item) => sum + item.price, 0);
  const itemCount = cartItems.length;

  return (
    <>
      {isOpen && <div className="cart-overlay" onClick={onClose} />}
      <div className={`cart-panel ${isOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

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
                    <p>{item.price} ETH</p>
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

        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <span>{total.toFixed(2)} ETH</span>
            </div>
            <button className="checkout-button">
              Purchase NFTs
            </button>
          </div>
        )}
      </div>
    </>
  );
} 