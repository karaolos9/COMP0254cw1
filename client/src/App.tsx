import './App.css'
import { MetaMaskUIProvider, useSDK, SDKProvider } from "@metamask/sdk-react-ui"
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Link, useNavigate } from "react-router-dom";
import { fetchPinataItems } from './api/pinataApi';
import { PinataImage } from './components/PinataImage';
import { useCart } from './context/CartContext';
import { Toast } from './components/Toast';
import { SearchBar } from './components/SearchBar';
import { CartPanel } from './components/CartPanel';
import { InlineProductDetails } from './components/InlineProductDetails';

// Pinata Item Type
interface PinataItem {
  ipfs_pin_hash: string;
  metadata?: {
    name?: string;
    keyvalues?: {
      Type?: string;
    };
  };
}

// Ethereum

declare global {
  interface Window {
    ethereum?: SDKProvider;
  }
}

function AppContent() {
  const navigate = useNavigate();
  const { sdk } = useSDK();
  const { addToCart, removeFromCart, cartItems } = useCart();

  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [nftItems, setNftItems] = useState<PinataItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // 4 items per row × 2 rows
  
  const PINATA_JWT = import.meta.env.VITE_PINATA_JWT_ADMIN
  const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [filteredItems, setFilteredItems] = useState<PinataItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Add this state for wallet dropdown
  const [showWalletInfo, setShowWalletInfo] = useState(false);

  // Add state for cart panel
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Add new state for selected product
  const [selectedProduct, setSelectedProduct] = useState<PinataItem | null>(null);

  const cartItemCount = cartItems.length;

  // Wallet
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

  // Check for existing connection on component mount
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

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const balance = await provider.getBalance(accounts[0]);
            setBalance(ethers.utils.formatEther(balance));
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
    };

    checkConnection();
    loadPinataItems();
  }, []);

  /* Listeners */
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        } else {
          setAccount(null);
          setIsConnected(false);
          setBalance(null);
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  /* Initialization */
  useEffect(() => {
    loadPinataItems();
  }, []);

  const loadPinataItems = async () => {
    try {
      const data = await fetchPinataItems();
      setNftItems(data.rows || []);
    } catch (error) {
      console.error("Error fetching Pinata items:", error);
    }
  };

  /* Pagination */
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const itemsToDisplay = isSearching ? filteredItems : nftItems;
  const currentItems = itemsToDisplay.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(itemsToDisplay.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleCardClick = (e: React.MouseEvent, item: PinataItem) => {
    // Don't show details if clicking the cart button
    if (!(e.target as HTMLElement).closest('.cart-button')) {
      setSelectedProduct(item);
    }
  };

  const handleCartClick = (e: React.MouseEvent, item: PinataItem) => {
    e.preventDefault();
    e.stopPropagation();
    const isInCart = cartItems.some(cartItem => cartItem.id === item.ipfs_pin_hash);
    
    if (isInCart) {
      removeFromCart(item.ipfs_pin_hash);
      setToastMessage('Removed from cart');
      setToastType('error');
    } else {
      addToCart({
        id: item.ipfs_pin_hash,
        image: `https://gateway.pinata.cloud/ipfs/${item.ipfs_pin_hash}`,
        name: item.metadata?.name || 'Pokemon Card NFT',
        price: 0.1,
        quantity: 1
      });
      setToastMessage('Added to cart');
      setToastType('success');
    }
    setShowToast(true);
  };

  const handleBuyNow = (e: React.MouseEvent, item: PinataItem) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add to cart if not already there
    if (!cartItems.some(cartItem => cartItem.id === item.ipfs_pin_hash)) {
      addToCart({
        id: item.ipfs_pin_hash,
        image: `https://gateway.pinata.cloud/ipfs/${item.ipfs_pin_hash}`,
        name: item.metadata?.name || 'Pokemon Card NFT',
        price: 0.1,
        quantity: 1
      });
      setToastMessage('Added to cart');
      setToastType('success');
      setShowToast(true);
    }
    
    // Open cart panel
    setIsCartOpen(true);
  };

  const handleSearch = (searchTerm: string, types: string[]) => {
    setSelectedTypes(types);
    
    if (!searchTerm.trim() && types.length === 0) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const filtered = nftItems.filter(item => {
      const nameMatch = !searchTerm.trim() || 
        item.metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const typeMatch = types.length === 0 || 
        types.includes(item.metadata?.keyvalues?.Type || '');
      
      return nameMatch && typeMatch;
    });
    
    setFilteredItems(filtered);
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <section id="header">
        <div className="header-left">
          <img 
            src="/img/poke_ball.png" 
            className="logo" 
            alt="Pokeball" 
            width="64" 
            height="57" 
          />
          <h1>Pokémon NFT Trading Site</h1>
        </div>

        <div>
          <ul id="navbar">
            <SearchBar onSearch={handleSearch} />
            <li id="lg-bag">
              <button 
                className="cart-icon-container"
                onClick={() => setIsCartOpen(true)}
              >
                <i className="far fa-shopping-bag"></i>
                {cartItemCount > 0 && (
                  <span className="cart-count">{cartItemCount}</span>
                )}
              </button>
            </li>
            <div className="wallet-section">
              {!isConnected ? (
                <button onClick={connectWallet} disabled={isConnecting} className="wallet-button">
                  <i className="fas fa-wallet"></i>
                  <span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
                </button>
              ) : (
                <div className="wallet-connected">
                  <button 
                    className="wallet-info-button"
                    onClick={() => setShowWalletInfo(!showWalletInfo)}
                  >
                    <i className="fas fa-wallet"></i>
                    <span>Connected</span>
                    <i className={`fas fa-chevron-${showWalletInfo ? 'up' : 'down'}`}></i>
                  </button>
                  
                  {showWalletInfo && (
                    <div className="wallet-dropdown">
                      <div className="wallet-address">
                        <span>Address:</span>
                        <p>{account?.slice(0, 6)}...{account?.slice(-4)}</p>
                      </div>
                      <div className="wallet-balance">
                        <span>Balance:</span>
                        <p>{balance ? `${Number(balance).toFixed(4)} ETH` : 'Loading...'}</p>
                      </div>
                      <button onClick={disconnectWallet} className="disconnect-button">
                        <i className="fas fa-sign-out-alt"></i>
                        <span>Disconnect</span>
                      </button>
                    </div>
                  )}
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

      {/* <section id="hero">
        <h2>Trade Pokémon NFTs Now!</h2>
      </section> */}

      {/* <div className="divider-line"></div> */}
      <section id="product1" className="section-p1">
        <div className="pro-container">
          {currentItems.map((item) => (
            <div 
              key={item.ipfs_pin_hash} 
              className="pro"
              onClick={(e) => handleCardClick(e, item)}
            >
              <PinataImage 
                hash={item.ipfs_pin_hash}
                alt="NFT Item"
              />
              <div className="des">
                <span>{item.metadata?.keyvalues?.Type || 'Type'}</span>
                <h5>{item.metadata?.name || 'Pokemon Card NFT'}</h5>
                <div className="star">
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                  <i className="fas fa-star"></i>
                </div>
                <h4>0.1 ETH</h4>
              </div>
              <div className="button-group">
                <a 
                  href="#!"
                  className={`cart-button ${cartItems.some(cartItem => cartItem.id === item.ipfs_pin_hash) ? 'in-cart' : ''}`}
                  onClick={(e) => handleCartClick(e, item)}
                >
                  <i className="fal fa-shopping-cart cart"></i>
                  {cartItems.some(cartItem => cartItem.id === item.ipfs_pin_hash) && (
                    <div className="slash"></div>
                  )}
                </a>
                <a 
                  href="#!"
                  className="buy-now-button"
                  onClick={(e) => handleBuyNow(e, item)}
                >
                  Buy Now
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pagination" className="section-p1">
        {currentPage > 1 && (
          <a 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(currentPage - 1);
            }}
            className="nav-btn"
          >
            <i className="fas fa-long-arrow-alt-left"></i>
          </a>
        )}
        
        {Array.from({ length: totalPages }, (_, index) => (
          <a 
            key={index + 1}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(index + 1);
            }}
            className={currentPage === index + 1 ? 'active' : ''}
          >
            {index + 1}
          </a>
        ))}

        {currentPage < totalPages && (
          <a 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(currentPage + 1);
            }}
            className="nav-btn"
          >
            <i className="fas fa-long-arrow-alt-right"></i>
          </a>
        )}
      </section>

      {isSearching && filteredItems.length === 0 && (
        <div className="no-results">
          <h2>No Pokemon NFT found</h2>
        </div>
      )}

      {selectedProduct && (
        <InlineProductDetails
          ipfsHash={selectedProduct.ipfs_pin_hash}
          metadata={selectedProduct.metadata}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onHide={() => setShowToast(false)}
        type={toastType}
      />

      <CartPanel 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

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
