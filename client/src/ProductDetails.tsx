import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from './context/CartContext';
import { useWallet } from './context/WalletContext';
import { fetchPinataItemById } from './api/pinataApi';
import { PinataImage } from './components/PinataImage';

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
  
  const { account, isConnecting, isConnected, connectWallet, disconnectWallet } = useWallet();
  const { addToCart } = useCart();

  useEffect(() => {
    const loadProductDetails = async () => {
      if (id) {
        try {
          const productData = await fetchPinataItemById(id);
          if (productData) {
            setProduct(productData);
          }
        } catch (error) {
          console.error("Error fetching product details:", error);
        }
      }
    };

    loadProductDetails();
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        id: product.ipfs_pin_hash,
        image: `https://gateway.pinata.cloud/ipfs/${product.ipfs_pin_hash}`,
        name: product.metadata?.name || 'Pokemon Card NFT',
        price: 0.1,
        quantity: 1
      });
      alert('Item added to cart!');
    }
  };

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
        <PinataImage 
          hash={product.ipfs_pin_hash}
          alt={product.metadata?.name || 'NFT Item'}
          style={{ width: '100%' }}
        />
      </div>

      <div className="single-pro-details">
        <h1>{product.metadata?.name || 'Pokemon Card NFT'}</h1>
        <div style={{ marginBottom: '40px' }}></div> 
        <h3>{'Type: ' + product.metadata?.keyvalues?.Type || 'Type'}</h3>
        <div style={{ marginBottom: '40px' }}></div> 
        <h2>0.1 ETH</h2>
        <button className="normal" onClick={handleAddToCart}>Add To Cart</button>
        <h4>Product Details</h4>
        <span>{product.metadata?.keyvalues?.Details || 'No details available'}</span>
      </div>
    </section>
    </div>
  );
}

export default ProductDetails;
