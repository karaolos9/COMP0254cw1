import './App.css'
import { MetaMaskUIProvider, useSDK } from "@metamask/sdk-react-ui"
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

function AppContent() {
  // const { connected, connecting, account } = useSDK();
  const { sdk } = useSDK();

  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setIsConnecting(true);
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        setIsConnected(true);
      } catch (error) {
        console.error("Error connecting to wallet:", error);
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert("MetaMask is not installed. Please install it to use this app!");
    }
  };

  const disconnectWallet = async () => {
    if (window.confirm('Are you sure you want to disconnect your wallet?')) {
      // Clear app state
      setAccount(null);
      setBalance(null);
      setIsConnected(false);
  
      // Clear MetaMask account permissions
      if (window.ethereum) {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }], // Resets account permissions
        });
      }
    }
  };

  // Get Account Balance
  const getBalance = async () => {
    if (account && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const balance = await provider.getBalance(account);
      setBalance(ethers.utils.formatEther(balance)); // Convert balance to ETH
    }
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <section id="header">
        <div className="header-left">
          <a href="#">
            <img 
              src="/img/poke_ball.png" 
              className="logo" 
              alt="" 
              width="64" 
              height="57" 
            />
          </a>
          <h1>Pokémon NFT Trading Site</h1>
        </div>

        <div>
          <ul id="navbar">
            <li><a className="active" href="index.html">Home</a></li>
            <li><a href="about.html">About</a></li>
            <li id="lg-bag"><a href="cart.html"><i className="far fa-shopping-bag"></i></a></li>
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
            <a href="#" id="close"><i className="far fa-times"></i></a>
          </ul>
        </div>
        <div id="mobile">
          <a href="cart.html"><i className="far fa-shopping-bag"></i></a>
          <i id="bar" className="fas fa-outdent"></i>
        </div>

      </section>

      <section id="hero">
        <h2>Trade Pokémon Cards Now!</h2>
      </section>

      <div className="divider-line"></div>

      <section id="product1" className="section-p1">
        <div className="pro-container">
          {[...Array(8)].map((_, i) => (
            <div key={`f${i + 1}`} className="pro" onClick={() => window.location.href='sproduct.html'}>
              <img src={`/img/products/f${i + 1}.jpg`} alt="" />
              <div className="des">
                <h5>Cartoon Astronaut T-Shirts</h5>
                <div className="star">
                  {[...Array(5)].map((_, index) => (
                    <i key={index} className="fas fa-star"></i>
                  ))}
                </div>
                <h4>$78</h4>
              </div>
              <a href="#"><i className="fal fa-shopping-cart cart"></i></a>
            </div>
          ))}
          
          {[...Array(8)].map((_, i) => (
            <div key={`n${i + 1}`} className="pro">
              <img src={`/img/products/n${i + 1}.jpg`} alt="" />
              <div className="des">
                <h5>Cartoon Astronaut T-Shirts</h5>
                <div className="star">
                  {[...Array(5)].map((_, index) => (
                    <i key={index} className="fas fa-star"></i>
                  ))}
                </div>
                <h4>$78</h4>
              </div>
              <a href="#"><i className="fal fa-shopping-cart cart"></i></a>
            </div>
          ))}
        </div>
      </section>

      <section id="pagination" className="section-p1">
        <a href="#">1</a>
        <a href="#">2</a>
        <a href="#"><i className="fas fa-long-arrow-alt-right"></i></a>
      </section>

      {/* Note: You'll need to continue converting the rest of the HTML similarly */}
    </div>
  );
}

function App() {
  return (
    <MetaMaskUIProvider
      sdkOptions={{
        dappMetadata: {
          name: "Pokemon NFT Trading Site",
        },
      }}
    >
      <AppContent />
    </MetaMaskUIProvider>
  )
}

export default App
