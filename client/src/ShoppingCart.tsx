import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from './context/CartContext';
import { useWallet } from './context/WalletContext';
import { PinataImage } from './components/PinataImage';

function ShoppingCart() {
  const { account, isConnecting, isConnected, connectWallet, disconnectWallet } = useWallet();
  const { cartItems, removeFromCart, updateQuantity } = useCart();

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  };

  return (
    <div className="cart-container">
      <section id="header">
        <div className="header-left">
          <Link to="/">
            <img 
              src="/img/poke_ball.png" 
              className="logo" 
              alt="" 
              width="64" 
              height="57" 
            />
          </Link>
          <h1>Pokémon NFT Trading Site</h1>
        </div>

        <div>
          <ul id="navbar">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li id="lg-bag"><Link to="/cart" className="active"><i className="far fa-shopping-bag"></i></Link></li>
            <div className="wallet-section">
              {!isConnected ? (
                <button onClick={connectWallet} disabled={isConnecting}>
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              ) : (
                <div>
                  <span className="account-text">Connected: {account?.slice(0, 6)}...{account?.slice(-4)}</span>
                  <button onClick={disconnectWallet}>Disconnect</button>
                </div>
              )}
            </div>
          </ul>
        </div>
      </section>

      <section id="cart" className="section-p1">
        <table width="100%">
          <thead>
            <tr>
              <td>Remove</td>
              <td>Image</td>
              <td>Name</td>
              <td>Price</td>
              <td>Subtotal</td>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    removeFromCart(item.id);
                  }}>
                    <i className="far fa-times-circle"></i>
                  </a>
                </td>
                <td>
                  <PinataImage 
                    hash={item.id}
                    alt={item.name}
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  />
                </td>
                <td>{item.name}</td>
                <td>{item.price} ETH</td>
                <td>{item.price} ETH</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="cart-add" className="section-p1">
        <div id="subtotal">
          <h3>Cart Totals</h3>
          <table>
            <tr>
              <td><strong>Total</strong></td>
              <td>{calculateSubtotal().toFixed(2)} ETH</td>
            </tr>
          </table>
          <button className="normal">Proceed to checkout</button>
        </div>
      </section>
    </div>
  );
}

export default ShoppingCart;
