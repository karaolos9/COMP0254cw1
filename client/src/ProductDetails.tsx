import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface PinataItem {
  ipfs_pin_hash: string;
  metadata?: {
    name?: string;
    keyvalues?: {
      Type?: string;
      Details?: string;
    };
  };
}

function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<PinataItem | null>(null);
  
  const [account, setAccount] = useState<string | null>(null);
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
      alert("MetaMask is not installed. Please install it to use this app");
    }
  };

  const disconnectWallet = async () => {
    if (window.confirm('Disconnect your wallet?')) {
      setAccount(null);
      setIsConnected(false);
      if (window.ethereum) {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      }
    }
  };

  // Check wallet connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts"
          });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
    };

    checkConnection();
  }, []);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const PINATA_JWT = import.meta.env.VITE_PINATA_JWT_ADMIN;
        const response = await fetch(`https://api.pinata.cloud/data/pinList?hashContains=${id}`, {
          headers: {
            Authorization: `Bearer ${PINATA_JWT}`,
          },
        });
        const data = await response.json();
        if (data.rows && data.rows.length > 0) {
          setProduct(data.rows[0]);
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
      }
    };

    if (id) {
      fetchProductDetails();
    }
  }, [id]);

  if (!product) {
    return <div>Loading...</div>;
  }

  return (
    <div>
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
            <li><a className="active" href="/">Home</a></li>
            <li><a href="/about">About</a></li>
            <li id="lg-bag"><a href="/cart"><i className="far fa-shopping-bag"></i></a></li>
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
    <section id="prodetails" className="section-p1">
      <div className="single-pro-image">
        <img 
          src={`https://gateway.pinata.cloud/ipfs/${product.ipfs_pin_hash}`} 
          width="100%" 
          id="MainImg" 
          alt=""
        />
      </div>

      <div className="single-pro-details">
        <h1>{product.metadata?.name || 'Pokemon Card NFT'}</h1>
        <div style={{ marginBottom: '40px' }}></div> 
        <h3>{'Type: ' + product.metadata?.keyvalues?.Type || 'Type'}</h3>
        <div style={{ marginBottom: '40px' }}></div> 
        <h2>0.1 ETH</h2>
        <input type="number" value="1" />
        <button className="normal">Add To Cart</button>
        <h4>Product Details</h4>
        <span>{product.metadata?.keyvalues?.Details || 'No details available'}</span>
      </div>
    </section>
    </div>
  );
}

export default ProductDetails;
