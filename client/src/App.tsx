import './App.css'
import { MetaMaskUIProvider } from "@metamask/sdk-react-ui"
import type { SDKProvider } from "@metamask/sdk";
import React, { useState, useEffect, lazy, Suspense } from "react";
import { ethers } from "ethers";
import { fetchPinataItems } from './api/pinataApi';
import { PinataImage } from './components/PinataImage';
import { useCart } from './context/CartContext';
import { Toast } from './components/Toast';
import { SearchBar } from './components/SearchBar';
import { CONTRACT_ABIS } from './config';
import InlineProductDetails from './components/InlineProductDetails';
import type { PinataItem as ImportedPinataItem } from './types';

// Lazy load components
const CartPanel = lazy(() => import('./components/CartPanel'));
const Profile = lazy(() => import('./components/Profile'));

// Use imported type with a different name to avoid conflicts
type PinataItem = ImportedPinataItem & {
  price?: string;
  seller?: string;
  tokenId?: string;
  isListed?: boolean;
  isAuction?: boolean;
};

// Update the Toast component props
interface ToastProps {
  message: string;
  isVisible: boolean;
  onHide: () => void;
  type: 'success' | 'error';
}

// Add these near the top of your AppContent component
const NFT_CONTRACT_ADDRESS = "0xC252E988c7dE8a2BFbf6cE0a1A92FECE5A74C4D1";
const TRADING_CONTRACT_ADDRESS = "0xD04E7654B270cec62377610643bbB0FB8a93FcB9";

// Add these new interfaces
interface FilterState {
  status: 'all' | 'listed' | 'auction';
  owner: 'all' | 'me';
  priceRange: {
    min: number | null;
    max: number | null;
  };
  types: string[];
}

// Add near the top with other state declarations
const pokemonTypes = [
  'Normal',
  'Fire',
  'Water',
  'Grass',
  'Electric',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Dark',
  'Steel',
  'Fairy'
];

interface NFTListing {
  tokenId: string;
  ipfsHash: string;
  price: string;
  seller: string;
  isAuction: boolean;
}

// Add network configuration
const NETWORK_CONFIG = {
  chainId: '0xaa36a7', // Sepolia
  chainName: 'Sepolia',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/8XyigRnoVSZULHhAxlOfXLfcEcNUZ36P'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
};

// Update Window interface to use SDKProvider
declare global {
  interface Window {
    ethereum?: SDKProvider;
  }
}

/**
 * Main content component containing all the application logic and UI
 * Handles:
 * - Wallet connection/disconnection with MetaMask
 * - NFT display and pagination
 * - Shopping cart functionality
 * - Search and filtering
 */
function AppContent() {
  // const navigate = useNavigate();
  // const { sdk } = useSDK();
  const { addToCart, removeFromCart, cartItems } = useCart();

  // Wallet State Management
  const [account, setAccount] = useState<string | null>(null);        // Current wallet address
  const [balance, setBalance] = useState<string | null>(null);        // Wallet ETH balance
  const [isConnecting, setIsConnecting] = useState(false);           // Wallet connection status
  const [isConnected, setIsConnected] = useState(false);             // Wallet connected status
  
  // NFT Display Management
  const [nftItems, setNftItems] = useState<PinataItem[]>([]);        // All NFT items
  const [currentPage, setCurrentPage] = useState(1);                  // Current page number
  const [totalPages, setTotalPages] = useState(1);
  const [currentItems, setCurrentItems] = useState<PinataItem[]>([]);  // Current page items
  const itemsPerPage = 9;                                            // Items per page (3x3 grid)
  
  // Search and Filter Management
  const [filteredItems, setFilteredItems] = useState<PinataItem[]>([]); // Filtered NFT items
  const [isSearching, setIsSearching] = useState(false);               // Search active status
  
  // UI State Management
  const [showWalletInfo, setShowWalletInfo] = useState(false);        // Wallet dropdown visibility
  const [isCartOpen, setIsCartOpen] = useState(false);                // Cart panel visibility
  const [selectedProduct, setSelectedProduct] = useState<PinataItem | null>(null); // Selected NFT details
  
  // Toast Notification Management
  const [toastMessage, setToastMessage] = useState('');               // Toast message content
  const [showToast, setShowToast] = useState(false);                  // Toast visibility
  const [toastType, setToastType] = useState<'success' | 'error'>('success'); // Toast type

  // Add this to your AppContent component state
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    owner: 'all',
    priceRange: {
      min: null,
      max: null
    },
    types: []
  });

  // Add this to your AppContent component state
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // Add searchTerm to the component state
  const [searchTerm, setSearchTerm] = useState('');

  const cartItemCount = cartItems.length;

  // Add this to your AppContent component state
  const [currentView, setCurrentView] = useState('main'); // 'main' or 'profile'

  const [listedNFTs, setListedNFTs] = useState<NFTListing[]>([]);

  /**
   * Wallet Connection Handler
   * Connects to MetaMask wallet and fetches account balance
   */
  const connectWallet = async () => {
    if (!window.ethereum) {
      setToastMessage('Please install MetaMask');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setIsConnecting(true);
    try {
      // Clear any existing connection first
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        setAccount(account);
        setIsConnected(true);

        // Switch to Sepolia if needed
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: NETWORK_CONFIG.chainId }],
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [NETWORK_CONFIG],
              });
            } catch (addError) {
              console.error('Error adding Sepolia network:', addError);
              throw addError;
            }
          } else {
            throw switchError;
          }
        }

        setToastMessage('Wallet connected successfully');
        setToastType('success');
        setShowToast(true);

        // Store connection state
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', account);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setToastMessage('Error connecting wallet');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Wallet Disconnection Handler
   * Disconnects from MetaMask and clears wallet state
   */
  const disconnectWallet = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('walletConnected');
      localStorage.removeItem('walletAddress');

      // Clear state
      setAccount(null);
      setIsConnected(false);
      setBalance(null);
      setCurrentView('main');
      
      setToastMessage('Wallet disconnected');
      setToastType('success');
      setShowToast(true);

    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      setToastMessage('Error disconnecting wallet');
      setToastType('error');
      setShowToast(true);
    }
  };

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const wasConnected = localStorage.getItem('walletConnected') === 'true';
          const storedAddress = localStorage.getItem('walletAddress');

          if (wasConnected && storedAddress) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
            if (accounts.length > 0 && accounts[0].toLowerCase() === storedAddress.toLowerCase()) {
              setAccount(accounts[0]);
              setIsConnected(true);
            } else {
              // Clear stale connection data
              localStorage.removeItem('walletConnected');
              localStorage.removeItem('walletAddress');
            }
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  // Update event handlers with proper types
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          disconnectWallet();
        } else if (accounts[0].toLowerCase() !== account?.toLowerCase()) {
          // Different account selected
          setAccount(accounts[0]);
          setIsConnected(true);
          localStorage.setItem('walletConnected', 'true');
          localStorage.setItem('walletAddress', accounts[0]);
        }
      };

      const handleChainChanged = () => {
        setToastMessage('Network changed. Refreshing...');
        setToastType('error');
        setShowToast(true);
        setTimeout(() => window.location.reload(), 2000);
      };

      const handleDisconnect = () => {
        disconnectWallet();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged as (...args: unknown[]) => void);
      window.ethereum.on('chainChanged', handleChainChanged as (...args: unknown[]) => void);
      window.ethereum.on('disconnect', handleDisconnect as (...args: unknown[]) => void);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged as (...args: unknown[]) => void);
          window.ethereum.removeListener('chainChanged', handleChainChanged as (...args: unknown[]) => void);
          window.ethereum.removeListener('disconnect', handleDisconnect as (...args: unknown[]) => void);
        }
      };
    }
  }, [account]);

  // Get Account Balance
  // const getBalance = async () => {
  //   if (account && window.ethereum) {
  //     const provider = new ethers.providers.Web3Provider(window.ethereum);
  //     const balance = await provider.getBalance(account);
  //     setBalance(ethers.utils.formatEther(balance)); // Convert balance to ETH
  //   }
  // };

  /* Listeners */
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      setIsConnected(true);
    } else {
      setAccount(null);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: unknown) => {
        if (Array.isArray(accounts)) {
          handleAccountsChanged(accounts as string[]);
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
    fetchListedNFTs();
  }, []);

  // Update type handling in state updates
  const setNftItemsWithTypes = (items: PinataItem[]) => {
    setNftItems(items.map(item => ({
      ...item,
      price: item.price || undefined,
      seller: item.seller || undefined,
      tokenId: item.tokenId || undefined,
      isListed: item.isListed || false,
      isAuction: item.isAuction || false
    })));
  };

  // Update the checkNFTOwnership function to handle types properly
  const checkNFTOwnership = async (items: PinataItem[]) => {
    if (!window.ethereum || !account) return items;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const nftContract = new ethers.Contract(
        NFT_CONTRACT_ADDRESS,
        CONTRACT_ABIS.NFT_CONTRACT,
        provider
      );

      const totalTokens = await nftContract.cardIdCounter();
      const checkedItems = await Promise.all(items.map(async (item) => {
        try {
          for (let tokenId = 1; tokenId <= totalTokens; tokenId++) {
            try {
              const uri = await nftContract.tokenURI(tokenId);
              const owner = await nftContract.ownerOf(tokenId);
              
              const cleanUri = uri.replace('ipfs://', '');
              const cleanHash = item.ipfs_pin_hash;
              
              if (cleanUri === cleanHash) {
                return {
                  ...item,
                  isOwned: owner.toLowerCase() === account.toLowerCase(),
                  tokenId: tokenId.toString()
                };
              }
            } catch (e) {
              continue;
            }
          }
          return { ...item, isOwned: false, tokenId: undefined };
        } catch (error) {
          console.error('Error checking ownership:', error);
          return item;
        }
      }));

      setNftItems(checkedItems);
      return checkedItems;
    } catch (error) {
      console.error('Error in checkNFTOwnership:', error);
      return items;
    }
  };

  const loadPinataItems = async () => {
    try {
      const data = await fetchPinataItems();
      console.log("Fetched Pinata items:", data.rows);
      
      const itemsWithOwnership = await checkNFTOwnership(data.rows || []);
      console.log("Items with ownership checked:", itemsWithOwnership);
      
      // Set all items regardless of ownership
      setNftItems(itemsWithOwnership);
    } catch (error) {
      console.error("Error fetching Pinata items:", error);
    }
  };

  // Make sure this useEffect is present
  useEffect(() => {
    if (account) {
      console.log("Account changed, reloading items for:", account);
      loadPinataItems();
    }
  }, [account]);

  /* Pagination */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const displayItems = nftItems.filter(item => {
      const listing = listedNFTs.find(nft => nft.tokenId === item.ipfs_pin_hash);
      return listing !== undefined;
    });
    const startIndex = (page - 1) * itemsPerPage;
    setCurrentItems(displayItems.slice(startIndex, startIndex + itemsPerPage));
  };

  /**
   * NFT Card Click Handler
   * Opens detailed view of selected NFT
   */
  const handleCardClick = (e: React.MouseEvent, item: PinataItem) => {
    e.preventDefault();
    const selectedItem: PinataItem = {
      ...item,
      tokenId: item.tokenId?.toString()
    };
    setSelectedProduct(selectedItem);
  };

  /**
   * Cart Interaction Handlers
   * Handle adding/removing items from cart and buy now functionality
   */
  const handleCartClick = (e: React.MouseEvent, item: PinataItem) => {
    e.preventDefault();
    e.stopPropagation();
    const isInCart = cartItems.some(cartItem => cartItem.id === item.ipfs_pin_hash);
    
    if (isInCart) {
      removeFromCart(item.ipfs_pin_hash);
      setToastMessage('Removed from cart');
      setToastType('error');
    } else {
      if (!item.tokenId) {
        setToastMessage('Error: Token ID not found');
        setToastType('error');
        setShowToast(true);
        return;
      }
      addToCart({
        id: item.ipfs_pin_hash,
        image: `https://gateway.pinata.cloud/ipfs/${item.ipfs_pin_hash}`,
        name: item.metadata?.name || 'Pokemon Card NFT',
        price: item.price ? parseFloat(item.price) : 0,
        quantity: 1,
        tokenId: parseInt(item.tokenId)
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
      if (!item.tokenId) {
        setToastMessage('Error: Token ID not found');
        setToastType('error');
        setShowToast(true);
        return;
      }
      addToCart({
        id: item.ipfs_pin_hash,
        image: `https://gateway.pinata.cloud/ipfs/${item.ipfs_pin_hash}`,
        name: item.metadata?.name || 'Pokemon Card NFT',
        price: item.price ? parseFloat(item.price) : 0,
        quantity: 1,
        tokenId: parseInt(item.tokenId)
      });
      setToastMessage('Added to cart');
      setToastType('success');
    }
    
    // Open cart panel
    setIsCartOpen(true);
  };

  /**
   * Search Handler
   * Filters NFTs based on name and type
   * Resets to page 1 when searching
   */
  const handleSearch = (searchTerm: string) => {
    setSearchTerm(searchTerm);
    setCurrentPage(1);
    setIsSearching(!!searchTerm);
  };

  // Add filter handling functions
  const handleFilterChange = (filterType: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handlePriceRangeChange = (min: number | null, max: number | null) => {
    setFilters(prev => ({
      ...prev,
      priceRange: { min, max }
    }));
  };

  // Update the getFilteredItems function
  const getFilteredItems = () => {
    return (currentView === 'main' ? filteredItems : nftItems).filter(item => {
      // Search filter
      if (searchTerm) {
        const itemName = item.metadata?.name?.toLowerCase() || '';
        if (!itemName.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      // Owner filter - only apply on main view
      if (currentView === 'main') {
        if (filters.owner === 'me' && !item.isOwned) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all') {
        const listing = listedNFTs.find(nft => nft.tokenId === item.ipfs_pin_hash);
        if (filters.status === 'listed' && !listing) {
          return false;
        }
        if (filters.status === 'auction' && (!listing || !listing.isAuction)) {
          return false;
        }
      }

      // Price filter
      if (filters.priceRange.min || filters.priceRange.max) {
        const price = (item as any).price ? parseFloat((item as any).price) : 0;
        if (filters.priceRange.min && price < filters.priceRange.min) return false;
        if (filters.priceRange.max && price > filters.priceRange.max) return false;
      }

      // Type filter
      if (filters.types.length > 0) {
        const itemType = item.metadata?.keyvalues?.Type || '';
        if (!filters.types.includes(itemType)) {
          return false;
        }
      }

      return true;
    });
  };

  // Update the filtering logic for the main page
  useEffect(() => {
    if (currentView === 'main') {
      console.log("Starting filtering with:", {
        totalItems: nftItems.length,
        listedNFTs: listedNFTs.length,
        filters,
        account
      });

      // Map of listed NFTs by IPFS hash for quick lookup
      const listedNFTsMap = new Map(
        listedNFTs.map(nft => [nft.ipfsHash, nft])
      );

      // Start with all NFT items
      let displayItems = nftItems.map(item => ({
        ...item,
        isListed: listedNFTsMap.has(item.ipfs_pin_hash),
        price: listedNFTsMap.get(item.ipfs_pin_hash)?.price,
        seller: listedNFTsMap.get(item.ipfs_pin_hash)?.seller,
        tokenId: listedNFTsMap.get(item.ipfs_pin_hash)?.tokenId,
        isAuction: listedNFTsMap.get(item.ipfs_pin_hash)?.isAuction || false
      }));

      // Filter based on listing status
      if (filters.status === 'listed') {
        displayItems = displayItems.filter(item => item.isListed && !item.isAuction);
      } else if (filters.status === 'auction') {
        displayItems = displayItems.filter(item => item.isListed && item.isAuction);
      } else if (filters.status === 'all') {
        displayItems = displayItems.filter(item => item.isListed); // Show all listed items
      }

      // Apply owner filter if selected
      if (filters.owner === 'me' && account) {
        displayItems = displayItems.filter(item => 
          item.seller?.toLowerCase() === account.toLowerCase()
        );
      }

      console.log("Filtered items:", {
        displayItems,
        filterStatus: filters.status,
        filterOwner: filters.owner
      });

      setFilteredItems(displayItems);
      setCurrentItems(displayItems.slice(0, itemsPerPage));
      setTotalPages(Math.ceil(displayItems.length / itemsPerPage));
    }
  }, [currentView, nftItems, listedNFTs, account, filters.status, filters.owner, itemsPerPage]);

  // Update useEffect for current items
  useEffect(() => {
    const filtered = filteredItems.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    setCurrentItems(filtered);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Update type selection handler
  const handleTypeSelection = (type: string) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type) 
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  // Add type removal handler
  const handleRemoveType = (typeToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFilters(prev => ({
      ...prev,
      types: prev.types.filter(type => type !== typeToRemove)
    }));
  };

  const fetchListedNFTs = async () => {
    if (!window.ethereum) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tradingContract = new ethers.Contract(
        TRADING_CONTRACT_ADDRESS,
        CONTRACT_ABIS.TRADING_CONTRACT,
        provider
      );
      
      // Get listed NFTs from contract events
      const filter = tradingContract.filters.CardListed();
      const events = await tradingContract.queryFilter(filter);
      
      // Get NFT contract for tokenURI lookup
      const nftContract = new ethers.Contract(
        NFT_CONTRACT_ADDRESS,
        CONTRACT_ABIS.NFT_CONTRACT,
        provider
      );
      
      // Process events and check current listing status
      const activeListings = await Promise.all(
        events.map(async (event: any) => {
          const { tokenId, price, seller, isAuction } = event.args;
          
          try {
            const tokenURI = await nftContract.tokenURI(tokenId);
            const ipfsHash = tokenURI.replace('ipfs://', '');
            
            const listing = await tradingContract.listings(tokenId);
            
            if (listing.isActive) {
              return {
                tokenId: tokenId.toString(),
                ipfsHash,
                price: ethers.formatEther(price),
                seller,
                isAuction,
              };
            }
          } catch (error) {
            console.error("Error processing listing for token", tokenId.toString(), ":", error);
          }
          return null;
        })
      );

      const filteredListings = activeListings.filter((listing): listing is NFTListing => listing !== null);
      setListedNFTs(filteredListings);
    } catch (error) {
      console.error("Error fetching listed NFTs:", error);
    }
  };

  const handleCancelListing = async (e: React.MouseEvent, item: PinataItem) => {
    e.preventDefault();
    if (!window.ethereum || !item.tokenId) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tradingContract = new ethers.Contract(
        TRADING_CONTRACT_ADDRESS,
        CONTRACT_ABIS.TRADING_CONTRACT,
        signer
      );

      const tx = await tradingContract.cancelListing(item.tokenId);
      await tx.wait();

      await fetchListedNFTs();
      
      setToastMessage('Listing cancelled successfully');
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error('Error cancelling listing:', error);
      setToastMessage('Error cancelling listing');
      setToastType('error');
      setShowToast(true);
    }
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
            <button 
              className="cart-button"
              onClick={() => setIsCartOpen(true)}
            >
              <i className="fas fa-shopping-cart"></i>
              {cartItemCount > 0 && (
                <span className="cart-count">{cartItemCount}</span>
              )}
            </button>
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
            <button 
              className={`profile-btn ${currentView === 'profile' ? 'active' : ''}`}
              onClick={() => {
                if (!isConnected) {
                  setToastMessage('Please connect your wallet first');
                  setToastType('error');
                  setShowToast(true);
                  return;
                }
                setCurrentView(currentView === 'profile' ? 'main' : 'profile');
              }}
            >
              <i className={`fas ${currentView === 'profile' ? 'fa-home' : 'fa-user'}`}></i>
              <span>{currentView === 'profile' ? 'Home' : 'Profile'}</span>
            </button>
            <a href="#" id="close"><i className="far fa-times"></i></a>
          </ul>
        </div>
        <div id="mobile">
          <i id="bar" className="fas fa-outdent"></i>
        </div>

      </section>

      {/* <section id="hero">
        <h2>Trade Pokémon NFTs Now!</h2>
      </section> */}

      {/* <div className="divider-line"></div> */}
      <Suspense fallback={<div>Loading...</div>}>
        {currentView === 'main' ? (
          <div className="main-container">
            <aside className="sidebar">
              {/* Status Filter */}
              <div className="filter-section">
                <h3>Status</h3>
                <div className="filter-option">
                  <input
                    type="radio"
                    id="status-all"
                    name="status"
                    checked={filters.status === 'all'}
                    onChange={() => handleFilterChange('status', 'all')}
                  />
                  <label htmlFor="status-all">All</label>
                </div>
                <div className="filter-option">
                  <input
                    type="radio"
                    id="status-listed"
                    name="status"
                    checked={filters.status === 'listed'}
                    onChange={() => handleFilterChange('status', 'listed')}
                  />
                  <label htmlFor="status-listed">Listed</label>
                </div>
                <div className="filter-option">
                  <input
                    type="radio"
                    id="status-auction"
                    name="status"
                    checked={filters.status === 'auction'}
                    onChange={() => handleFilterChange('status', 'auction')}
                  />
                  <label htmlFor="status-auction">On Auction</label>
                </div>
              </div>

              {/* Owner Filter */}
              <div className="filter-section">
                <h3>Owner</h3>
                <div className="filter-option">
                  <input
                    type="radio"
                    id="owner-all"
                    name="owner"
                    checked={filters.owner === 'all'}
                    onChange={() => handleFilterChange('owner', 'all')}
                  />
                  <label htmlFor="owner-all">All</label>
                </div>
                <div className="filter-option">
                  <input
                    type="radio"
                    id="owner-me"
                    name="owner"
                    checked={filters.owner === 'me'}
                    onChange={() => handleFilterChange('owner', 'me')}
                  />
                  <label htmlFor="owner-me">My NFTs</label>
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="filter-section">
                <h3>Price</h3>
                <div className="price-range">
                  <input
                    type="number"
                    placeholder="Min"
                    className="price-input"
                    value={filters.priceRange.min || ''}
                    onChange={(e) => handlePriceRangeChange(
                      e.target.value ? Number(e.target.value) : null,
                      filters.priceRange.max
                    )}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="price-input"
                    value={filters.priceRange.max || ''}
                    onChange={(e) => handlePriceRangeChange(
                      filters.priceRange.min,
                      e.target.value ? Number(e.target.value) : null
                    )}
                  />
                </div>
              </div>

              {/* Traits Filter */}
              <div className="filter-section">
                <h3>Traits</h3>
                <div className="filter-option">
                  <div className="type-selector">
                    <button 
                      className="type-dropdown-button"
                      onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                    >
                      <div className="selected-types">
                        {filters.types.length === 0 ? (
                          <span>Select Types</span>
                        ) : (
                          <div className="type-tags">
                            {filters.types.map(type => (
                              <div key={type} className={`type-tag ${type.toLowerCase()}`}>
                                {type}
                                <button
                                  className="remove-type"
                                  onClick={(e) => handleRemoveType(type, e)}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <i className="fas fa-chevron-down"></i>
                    </button>
                    {isTypeDropdownOpen && (
                      <div className="type-dropdown-panel">
                        {pokemonTypes.map(type => (
                          <div 
                            key={type}
                            className={`type-badge ${type.toLowerCase()} ${
                              filters.types.includes(type) ? 'selected' : ''
                            }`}
                            onClick={() => handleTypeSelection(type)}
                          >
                            {type}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            <div className="content-area">
              <section id="product1" className="section-p1">
                <div className="pro-container">
                  {currentItems.length === 0 ? (
                    <div className="no-items-message">No NFTs found</div>
                  ) : (
                    currentItems.map((item) => (
                      <div 
                        key={item.ipfs_pin_hash} 
                        className="pro"
                        onClick={(e) => handleCardClick(e, item)}
                      >
                        <PinataImage 
                          hash={item.ipfs_pin_hash}
                          alt={item.metadata?.name || 'NFT Item'}
                        />
                        <div className="des">
                          <span>{item.metadata?.keyvalues?.Type || 'Type'}</span>
                          <h5>{item.metadata?.name || 'Pokemon Card NFT'}</h5>
                          {item.price && (
                            <div className="price-tag">
                              <span>{item.price} ETH</span>
                              {item.isAuction && <span className="auction-badge">Auction</span>}
                            </div>
                          )}
                        </div>
                        <div className="button-group">
                          <div 
                            className="tooltip" 
                            data-disabled={item.seller?.toLowerCase() === account?.toLowerCase() || item.isAuction}
                            data-tooltip-message={
                              item.seller?.toLowerCase() === account?.toLowerCase() 
                                ? "You are the owner of this NFT"
                                : item.isAuction 
                                  ? "This NFT is currently in an auction"
                                  : ""
                            }
                          >
                            <button
                              className={`cart-button ${cartItems.some(cartItem => cartItem.id === item.ipfs_pin_hash) ? 'in-cart' : ''}`}
                              onClick={(e) => handleCartClick(e, item)}
                              disabled={item.seller?.toLowerCase() === account?.toLowerCase() || item.isAuction}
                            >
                              <i className="fas fa-shopping-cart"></i>
                            </button>
                            {item.isAuction ? (
                              <button 
                                className="auction-button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCardClick(e, item);
                                  // Add a small delay to ensure the modal is mounted
                                  setTimeout(() => {
                                    const auctionSection = document.querySelector('.auction-section');
                                    auctionSection?.scrollIntoView({ behavior: 'smooth' });
                                  }, 100);
                                }}
                              >
                              View Auction
                              </button>
                            ) : (
                              <button 
                                className="buy-now-button"
                                onClick={(e) => handleBuyNow(e, item)}
                                disabled={item.seller?.toLowerCase() === account?.toLowerCase()}
                              >
                                Buy Now
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
            </div>
      </div>
        ) : (
          <Profile 
            nftItems={nftItems.filter(item => {
              const listing = listedNFTs.find(nft => nft.tokenId === item.tokenId);
              const isListed = listing && listing.seller.toLowerCase() === account?.toLowerCase();
              if (isListed) {
                return {
                  ...item,
                  price: listing.price,
                  isListed: true
                };
              }
              return item.isOwned || isListed;
            })}
            account={account}
          />
        )}
      </Suspense>

      {/* Product Details Modal */}
      {selectedProduct && (
        <Suspense fallback={<div>Loading...</div>}>
          <InlineProductDetails
            ipfsHash={selectedProduct.ipfs_pin_hash}
            metadata={selectedProduct.metadata}
            onClose={() => setSelectedProduct(null)}
            onCartOpen={() => setIsCartOpen(true)}
            price={selectedProduct.price || undefined}
            seller={selectedProduct.seller || undefined}
            tokenId={selectedProduct.tokenId ? Number(selectedProduct.tokenId) : undefined}
          />
        </Suspense>
      )}

      <CartPanel 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onHide={() => setShowToast(false)}
        type={toastType}
      />

      </div>
  );
}

/**
 * Root component that wraps the application with MetaMask provider
 * Enables MetaMask integration throughout the app
 */
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
