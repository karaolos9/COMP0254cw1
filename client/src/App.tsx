import './App.css'
import { MetaMaskUIProvider} from "@metamask/sdk-react-ui"
import React, { useState, useEffect, lazy, Suspense } from "react";
import { ethers } from "ethers";
import { fetchPinataItems } from './api/pinataApi';
import { PinataImage } from './components/PinataImage';
import { useCart } from './context/CartContext';
import { Toast } from './components/Toast';
import { SearchBar } from './components/SearchBar';
import { CONTRACT_ABIS } from './config';

// Lazy load components
const CartPanel = lazy(() => import('./components/CartPanel'));
const InlineProductDetails = lazy(() => import('./components/InlineProductDetails'));
const Profile = lazy(() => import('./components/Profile'));

// Interface for Pinata NFT item structure
interface PinataItem {
  ipfs_pin_hash: string;  // Unique identifier/hash for the NFT on IPFS
  metadata?: {
    name?: string;        // Name of the Pokemon NFT
    keyvalues?: {
      Type?: string;      // Pokemon type (e.g., Fire, Water, etc.)
    };
  };
  isOwned?: boolean;
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
  price: string;
  seller: string;
  isAuction: boolean;
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
    if (window.ethereum) {
      try {
        setIsConnecting(true);
        
        // Force a new connection request by first requesting permissions
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }]
        });

        // Then request accounts to get the selected account
        const accounts = (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as Array<string>;
        
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          
          const provider = new ethers.BrowserProvider(window.ethereum);
          const balance = await provider.getBalance(accounts[0]);
          setBalance(ethers.formatEther(balance));
        }
      } catch (error) {
        console.error("Error connecting to wallet:", error);
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert("MetaMask is not installed. Please install it to use this app");
    }
  };

  /**
   * Wallet Disconnection Handler
   * Disconnects from MetaMask and clears wallet state
   */
  const disconnectWallet = async () => {
    if (window.confirm('Disconnect your wallet?')) {
      // Only clear app state, don't revoke permissions
      setAccount(null);
      setBalance(null);
      setIsConnected(false);
      setShowWalletInfo(false);
    }
  };

  // Get Account Balance
  // const getBalance = async () => {
  //   if (account && window.ethereum) {
  //     const provider = new ethers.providers.Web3Provider(window.ethereum);
  //     const balance = await provider.getBalance(account);
  //     setBalance(ethers.utils.formatEther(balance)); // Convert balance to ETH
  //   }
  // };

  // Check for existing connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts"
          }) as string[];  // Type assertion here
          
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const balance = await provider.getBalance(accounts[0]);
            setBalance(ethers.formatEther(balance));
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
      window.ethereum.on('accountsChanged', ((accounts: unknown) => {
        const addressArray = accounts as string[];
        if (addressArray && addressArray.length > 0) {
          setAccount(addressArray[0]);
          setIsConnected(true);
        } else {
          setAccount(null);
          setIsConnected(false);
          setBalance(null);
        }
      }) as (...args: unknown[]) => void);
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

  const checkNFTOwnership = async (items: PinataItem[]) => {
    if (!window.ethereum || !account) return items;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const nftContract = new ethers.Contract(
        NFT_CONTRACT_ADDRESS,
        [
          "function ownerOf(uint256 tokenId) view returns (address)",
          "function tokenURI(uint256 tokenId) view returns (string)",
          "function cardIdCounter() view returns (uint256)"
        ],
        provider
      );

      // Get total number of minted tokens
      const totalTokens = await nftContract.cardIdCounter();
      console.log("Total minted tokens:", totalTokens.toString());

      const checkedItems = await Promise.all(items.map(async (item) => {
        try {
          // Check ownership for tokens from 1 to totalTokens
          for (let tokenId = 1; tokenId <= totalTokens; tokenId++) {
            try {
              const uri = await nftContract.tokenURI(tokenId);
              const owner = await nftContract.ownerOf(tokenId);
              
              // Remove 'ipfs://' prefix for comparison
              const cleanUri = uri.replace('ipfs://', '');
              const cleanHash = item.ipfs_pin_hash;
              
              if (cleanUri === cleanHash) {
                const isOwned = owner.toLowerCase() === account.toLowerCase();
                console.log(`Token ${tokenId}:`, {
                  uri: cleanUri,
                  hash: cleanHash,
                  owner,
                  account,
                  isOwned
                });
                return { ...item, isOwned };
              }
            } catch (e) {
              // Skip if token doesn't exist or other error
              continue;
            }
          }
          
          // If we didn't find a match, it's not minted yet or we don't own it
          return { ...item, isOwned: false };
        } catch (error) {
          console.error("Error checking individual item:", error);
          return { ...item, isOwned: false };
        }
      }));

      console.log("Checked items:", checkedItems);
      return checkedItems;
    } catch (error) {
      console.error("Error checking NFT ownership:", error);
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
    // Don't show details if clicking the cart button
    if (!(e.target as HTMLElement).closest('.cart-button')) {
      setSelectedProduct(item);
    }
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
      addToCart({
        id: item.ipfs_pin_hash,
        image: `https://gateway.pinata.cloud/ipfs/${item.ipfs_pin_hash}`,
        name: item.metadata?.name || 'Pokemon Card NFT',
        price: (item as any).price ? parseFloat((item as any).price) : 0,
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
        price: (item as any).price ? parseFloat((item as any).price) : 0,
        quantity: 1
      });
      setToastMessage('Added to cart');
      setToastType('success');
      setShowToast(true);
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
      let displayItems = nftItems;

      if (filters.owner === 'me') {
        // When "My NFTs" is selected, show only owned NFTs
        displayItems = nftItems.filter(item => item.isOwned);
      } else {
        // When "All" is selected, show only listed NFTs
        displayItems = nftItems.filter(item => {
          const listing = listedNFTs.find(nft => nft.tokenId === item.ipfs_pin_hash);
          if (listing) {
            (item as any).price = ethers.formatEther(listing.price);
            (item as any).isListed = true;
          }
          return listing !== undefined;
        });
      }
      
      console.log("NFT items:", nftItems.length);
      console.log("Listed NFTs:", listedNFTs.length);
      console.log("Display items:", displayItems.length);
      
      setFilteredItems(displayItems);
      setCurrentItems(displayItems.slice(0, itemsPerPage));
      setTotalPages(Math.ceil(displayItems.length / itemsPerPage));
    }
  }, [currentView, nftItems, listedNFTs, account, filters.owner]);

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
      console.log("Found listing events:", events.length);
      
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
          console.log("Processing event for tokenId:", tokenId.toString());
          
          try {
            // Get the IPFS hash for this token
            const tokenURI = await nftContract.tokenURI(tokenId);
            const ipfsHash = tokenURI.replace('ipfs://', '');
            console.log("Token", tokenId.toString(), "has IPFS hash:", ipfsHash);
            
            // Check if the listing is still active
            const listing = await tradingContract.listings(tokenId);
            console.log("Listing status for tokenId", tokenId.toString(), ":", listing);
            
            if (listing.isActive) {
              return {
                tokenId: ipfsHash, // Store the IPFS hash as the tokenId for comparison
                price: price.toString(),
                seller,
                isAuction,
              };
            }
          } catch (error) {
            console.error("Error processing listing for token", tokenId.toString(), ":", error);
          }
          return null; // Return null for inactive or errored listings
        })
      );

      // Filter out null values (inactive listings)
      const filteredListings = activeListings.filter((listing): listing is NFTListing => listing !== null);
      
      console.log("Active listings found:", filteredListings);
      setListedNFTs(filteredListings);
    } catch (error) {
      console.error("Error fetching listed NFTs:", error);
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
              <i className="fas fa-user"></i>
              <span>Profile</span>
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
                        <div className="name-price">
                          <h5>{item.metadata?.name || 'Pokemon Card NFT'}</h5>
                          <h4>{(item as any).price} ETH</h4>
                        </div>
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
            </div>
          </div>
        ) : (
          <Profile 
            nftItems={nftItems.filter(item => {
              console.log('Filtering item:', item); // Debug log
              return item.isOwned;
            })}
            account={account}
          />
        )}
      </Suspense>

      <Suspense fallback={<div>Loading...</div>}>
        {selectedProduct && (
          <InlineProductDetails
            ipfsHash={selectedProduct.ipfs_pin_hash}
            metadata={selectedProduct.metadata}
            onClose={() => setSelectedProduct(null)}
            onCartOpen={() => setIsCartOpen(true)}
            price={(selectedProduct as any).price}
          />
        )}

        <CartPanel 
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
        />
      </Suspense>

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
