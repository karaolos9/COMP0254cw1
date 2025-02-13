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
import { CONTRACT_ABIS, CONTRACT_ADDRESSES, NETWORK_CONFIG } from './config';
import InlineProductDetails from './components/InlineProductDetails';
import type { PinataItem as ImportedPinataItem } from './types';

// Lazy load components
const CartPanel = lazy(() => import('./components/CartPanel'));

// Pinata item info
type PinataItem = ImportedPinataItem & {
  price?: string;
  seller?: string;
  tokenId?: string;
  isListed?: boolean;
  isAuction?: boolean;
};

// Update the Toast component props
// interface ToastProps {
//   message: string;
//   isVisible: boolean;
//   onHide: () => void;
//   type: 'success' | 'error';
// }

// Keeps track of the current filter state
interface FilterState {
  status: 'all' | 'listed' | 'auction';
  owner: 'all' | 'me';
  priceRange: {
    min: number | null;
    max: number | null;
  };
  types: string[];
  statsRange: {
    hp: { min: number | null; max: number | null };
    attack: { min: number | null; max: number | null };
    defense: { min: number | null; max: number | null };
    speed: { min: number | null; max: number | null };
    special: { min: number | null; max: number | null };
  };
}

// Declares the types of Pokemon types
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

// Track and structure the NFT listings
interface NFTListing {
  tokenId: string;
  ipfsHash: string;
  price: string;
  seller: string;
  isAuction: boolean;
}

// Window interface to use SDKProvider
declare global {
  interface Window {
    ethereum?: SDKProvider;
  }
}

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
  
  // Search and Filter Management
  const [filteredItems, setFilteredItems] = useState<PinataItem[]>([]); // Filtered NFT items
  const [isSearching, setIsSearching] = useState(false);               // Search active status
  const [isProfileView, setIsProfileView] = useState(false);           // Profile view state
  
  // UI State Management
  const [showWalletInfo, setShowWalletInfo] = useState(false);        // Wallet dropdown visibility
  const [isCartOpen, setIsCartOpen] = useState(false);                // Cart panel visibility
  const [selectedProduct, setSelectedProduct] = useState<PinataItem | null>(null); // Selected NFT details
  
  // Toast Notification Management
  const [toastMessage, setToastMessage] = useState('');               // Toast message content
  const [showToast, setShowToast] = useState(false);                  // Toast visibility
  const [toastType, setToastType] = useState<'success' | 'error'>('success'); // Toast type

  // Filter using filter state
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    owner: 'all',
    priceRange: {
      min: null,
      max: null
    },
    types: [],
    statsRange: {
      hp: { min: 0, max: 100 },
      attack: { min: 0, max: 100 },
      defense: { min: 0, max: 100 },
      speed: { min: 0, max: 100 },
      special: { min: 0, max: 100 }
    }
  });

  // Check dropdown visibility
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // Add searchTerm to the component state
  const [searchTerm, setSearchTerm] = useState('');

  // Cart item count
  const cartItemCount = cartItems.length;

  // Main or profile view
  const [currentView, setCurrentView] = useState('main'); // 'main' or 'profile'

  // Track listed NFTs
  const [listedNFTs, setListedNFTs] = useState<NFTListing[]>([]);

  // Set the price inputs
  const [priceInputs, setPriceInputs] = useState({ min: '', max: '' });

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  // Add state for collapsed sections
  const [collapsedSections, setCollapsedSections] = useState({
    status: false,
    owner: false,
    price: false,
    traits: false,
    stats: false
  });

  // Initialize stats inputs state
  const [statsInputs, setStatsInputs] = useState({
    hp: { min: '0', max: '100' },
    attack: { min: '0', max: '100' },
    defense: { min: '0', max: '100' },
    speed: { min: '0', max: '100' },
    special: { min: '0', max: '100' }
  });

  // Store collapsed state in localStorage when it changes
  useEffect(() => {
    localStorage.setItem('collapsedSections', JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('collapsedSections');
    if (savedState) {
      setCollapsedSections(JSON.parse(savedState));
    }
  }, []);

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  /**
   * Checks if MetaMask is installed and returns a boolean
   */
  const checkIfMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && Boolean(window.ethereum);
  };

  /**
   * Wallet Connection Handler
   * Connects to MetaMask wallet and fetches account balance
   */
  const connectWallet = async () => {
    if (!checkIfMetaMaskInstalled()) {
      setToastMessage('Please install MetaMask first');
      setToastType('error');
      setShowToast(true);
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      // Force MetaMask to show the account selection popup
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      }) as string[];

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
              setToastMessage('Failed to add Sepolia network to MetaMask');
              setToastType('error');
              setShowToast(true);
              return;
            }
          } else {
            throw switchError;
          }
        }

        setToastMessage('Wallet connected successfully');
        setToastType('success');
        setShowToast(true);
        cartItems.forEach(item => removeFromCart(item.id));

        // Store connection state
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', account);
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      let errorMessage = 'Error connecting wallet';
      
      if (error.code === 4001) {
        errorMessage = 'You rejected the connection request';
      } else if (error.message.includes('already pending')) {
        errorMessage = 'Connection request already pending. Check MetaMask';
      }
      
      setToastMessage(errorMessage);
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
      setIsProfileView(false); // Reset profile view to false
      
      // Clear cart items
      cartItems.forEach(item => removeFromCart(item.id));
      
      // Force clear the connection
      if (window.ethereum && window.ethereum.removeAllListeners) {
        window.ethereum.removeAllListeners();
      }
      
      // Refresh NFTs and listings
      await Promise.all([
        loadPinataItems(),
        fetchListedNFTs()
      ]);
      
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
      if (checkIfMetaMaskInstalled()) {
        try {
          const wasConnected = localStorage.getItem('walletConnected') === 'true';
          const storedAddress = localStorage.getItem('walletAddress');

          if (wasConnected && storedAddress) {
            const accounts = await window.ethereum.request({ 
              method: 'eth_accounts' 
            }) as string[];
            
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
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('walletAddress');
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
  const getBalance = async () => {
    if (account && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(account);
        setBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance('Error');
      }
    }
  };

  // Update useEffect to call getBalance
  useEffect(() => {
    if (account) {
      getBalance();
      
      // Set up interval to update balance periodically
      const interval = setInterval(getBalance, 10000); // Update every 10 seconds
      
      return () => clearInterval(interval);
    } else {
      setBalance(null);
    }
  }, [account]);

  // Add event listener for chain/network changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        if (account) getBalance();
      });
      
      window.ethereum.on('accountsChanged', () => {
        if (account) getBalance();
      });
    }
  }, [account]);

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
        CONTRACT_ADDRESSES.NFT_CONTRACT,
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
    setIsLoading(true);
    try {
      const data = await fetchPinataItems();
      console.log("Fetched Pinata items:", data.rows);
      
      const itemsWithOwnership = await checkNFTOwnership(data.rows || []);
      console.log("Items with ownership checked:", itemsWithOwnership);
      
      // Set all items regardless of ownership
      setNftItems(itemsWithOwnership);
    } catch (error) {
      console.error("Error fetching Pinata items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Make sure this useEffect is present
  useEffect(() => {
    if (account) {
      console.log("Account changed, reloading items for:", account);
      loadPinataItems();
    }
  }, [account]);

  // NFT card click handler - Opens detailed view of selected NFT
  const handleCardClick = (e: React.MouseEvent, item: PinataItem) => {
    e.preventDefault();
    const selectedItem: PinataItem = {
      ...item,
      tokenId: item.tokenId?.toString()
    };
    setSelectedProduct(selectedItem);
  };

  // Cart interaction handlers
  // Handles adding/removing items from cart. If isBuyNow is true, only adds to cart
  const handleCartClick = (e: React.MouseEvent, item: PinataItem, isBuyNow: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    const isInCart = cartItems.some(cartItem => cartItem.id === item.ipfs_pin_hash);
    
    if (isInCart) {
      if (!isBuyNow) {  // Only remove if it's not a Buy Now action
        removeFromCart(item.ipfs_pin_hash);
        setToastMessage('Removed from cart');
        setToastType('error');
      }
    } else {
      if (!item.tokenId) {
        setToastMessage('Error: Token ID not found');
        setToastType('error');
        setShowToast(true);
        return;
      }
      // Add item to cart with all necessary details
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

  // Buy Now handler - Adds item to cart and opens cart panel
  const handleBuyNow = (e: React.MouseEvent, item: PinataItem) => {
    e.preventDefault();
    if (selectedProduct) {
      handleCartClick(e, selectedProduct, true);  // Pass true for isBuyNow
      setSelectedProduct(null);
    }
  };

  // Search handler - Filter based on name
  const handleSearch = (searchTerm: string) => {
    setSearchTerm(searchTerm);
    setIsSearching(!!searchTerm);
  };

  // Add filter handling functions
  const handleFilterChange = (filterType: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Price range filter handler
  const handlePriceRangeChange = (min: number | null, max: number | null) => {
    setFilters(prev => ({
      ...prev,
      priceRange: { min, max }
    }));
  };

  // Add stats range handler
  const handleStatsRangeChange = (
    stat: keyof typeof statsInputs,
    type: 'min' | 'max',
    value: string
  ) => {
    console.log('Stats range change:', { stat, type, value });

    // Update the input state first
    setStatsInputs(prev => ({
      ...prev,
      [stat]: {
        ...prev[stat],
        [type]: value
      }
    }));

    // Convert to number and validate
    let numValue: number | null = null;
    if (value !== '') {
      numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        console.log('Invalid number value:', numValue);
        return; // Invalid input, don't update filter
      }
    }

    console.log('Updating filter with value:', numValue);

    // Update the filter state
    setFilters(prev => {
      const newFilters = {
        ...prev,
        statsRange: {
          ...prev.statsRange,
          [stat]: {
            ...prev.statsRange[stat],
            [type]: numValue
          }
        }
      };
      console.log('New filters state:', newFilters);
      return newFilters;
    });
  };

  // NFT filtering logic
  useEffect(() => {
    const applyFilters = async () => {
      console.log("Starting filtering with:", {
        totalItems: nftItems.length,
        listedNFTs: listedNFTs.length,
        filters,
        account,
        searchTerm,
        isProfileView
      });

      // Create quick lookup map for listed NFTs
      const listedNFTsMap = new Map(
        listedNFTs.map(nft => [nft.ipfsHash, nft])
      );

      // Start with all NFTs and enrich with listing data
      let displayItems = nftItems.map(item => {
        const listing = listedNFTsMap.get(item.ipfs_pin_hash);
        return {
          ...item,
          isListed: listedNFTsMap.has(item.ipfs_pin_hash),
          price: listing?.price,
          seller: listing?.seller,
          // Keep the original tokenId if it exists, otherwise use the one from listing
          tokenId: item.tokenId || listing?.tokenId,
          isAuction: listing?.isAuction || false
        };
      });

      // Apply profile view filter
      if (isProfileView) {
        displayItems = displayItems.filter(item => 
          item.isOwned || (item.seller?.toLowerCase() === account?.toLowerCase())
        );
      }

      // Apply name search filter
      if (searchTerm) {
        displayItems = displayItems.filter(item => 
          item.metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Filter by listing status
      if (filters.status === 'listed') {
        displayItems = displayItems.filter(item => item.isListed && !item.isAuction);
      } else if (filters.status === 'auction') {
        displayItems = displayItems.filter(item => item.isListed && item.isAuction);
      } else if (filters.status === 'all' && !isProfileView) {
        displayItems = displayItems.filter(item => item.isListed);
      }

      // Filter by owner
      if (filters.owner === 'me' && account) {
        displayItems = displayItems.filter(item => 
          item.seller?.toLowerCase() === account.toLowerCase()
        );
      }

      // Filter by Pokemon types
      if (filters.types.length > 0) {
        displayItems = displayItems.filter(item => {
          const itemType = item.metadata?.keyvalues?.Type;
          return itemType && filters.types.includes(itemType);
        });
      }

      // Apply price range filter
      if (filters.priceRange.min !== null || filters.priceRange.max !== null) {
        displayItems = displayItems.filter(item => {
          const price = item.price ? parseFloat(item.price) : 0;
          if (filters.priceRange.min !== null && price < filters.priceRange.min) return false;
          if (filters.priceRange.max !== null && price > filters.priceRange.max) return false;
          return true;
        });
      }

      // Apply stats range filter
      if (Object.values(filters.statsRange).some(range => range.min !== null || range.max !== null)) {
        console.log('Stats filters active:', filters.statsRange);
        
        const filteredItems = [];
        for (const item of displayItems) {
          console.log('Processing item:', {
            ipfsHash: item.ipfs_pin_hash,
            tokenId: item.tokenId,
            name: item.metadata?.name
          });
          
          if (!item.tokenId) {
            console.log('No token ID found for item:', item.metadata?.name);
            continue;
          }

          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const nftContract = new ethers.Contract(
              CONTRACT_ADDRESSES.NFT_CONTRACT,
              CONTRACT_ABIS.NFT_CONTRACT,
              provider
            );

            // Convert tokenId to number if it's a string
            const tokenIdNumber = typeof item.tokenId === 'string' ? parseInt(item.tokenId) : item.tokenId;
            console.log('Checking token ID:', tokenIdNumber);

            // Get Pokemon stats from the blockchain
            const stats = await nftContract.getPokemonStats(tokenIdNumber);
            console.log('Blockchain stats for token', tokenIdNumber, ':', stats);

            const checkRange = (statValue: number, min: number | null, max: number | null) => {
              // Use default range if min/max is null
              const effectiveMin = min ?? 0;
              const effectiveMax = max ?? 100;

              // Check if value is within range (inclusive)
              const isInRange = statValue >= effectiveMin && statValue <= effectiveMax;
              console.log(`Value ${statValue} ${isInRange ? 'within' : 'outside'} range ${effectiveMin}-${effectiveMax}`);
              return isInRange;
            };

            // Check all stats against their ranges using blockchain data
            const isInRange = checkRange(Number(stats.hp), filters.statsRange.hp.min, filters.statsRange.hp.max) &&
                             checkRange(Number(stats.attack), filters.statsRange.attack.min, filters.statsRange.attack.max) &&
                             checkRange(Number(stats.defense), filters.statsRange.defense.min, filters.statsRange.defense.max) &&
                             checkRange(Number(stats.speed), filters.statsRange.speed.min, filters.statsRange.speed.max) &&
                             checkRange(Number(stats.special), filters.statsRange.special.min, filters.statsRange.special.max);

            if (isInRange) {
              filteredItems.push(item);
            }
          } catch (error) {
            console.error('Error fetching blockchain stats for token', item.tokenId, ':', error);
            continue;
          }
        }
        displayItems = filteredItems;
        console.log('Filtered items count:', displayItems.length);
      }

      setFilteredItems(displayItems);
    };

    applyFilters();
  }, [currentView, nftItems, listedNFTs, account, filters.status, filters.owner, filters.types, filters.priceRange.min, filters.priceRange.max, searchTerm, isProfileView, filters.statsRange]);

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
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
        CONTRACT_ABIS.TRADING_CONTRACT,
        provider
      );
      
      // Get listed NFTs from contract events
      const filter = tradingContract.filters.CardListed();
      const events = await tradingContract.queryFilter(filter);
      
      // Get NFT contract for tokenURI lookup
      const nftContract = new ethers.Contract(
        CONTRACT_ADDRESSES.NFT_CONTRACT,
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
        CONTRACT_ADDRESSES.TRADING_CONTRACT,
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

  // Add this useEffect to reload items when view changes
  useEffect(() => {
    if (isConnected && currentView === 'profile') {
      console.log("View changed to profile, reloading items");
      loadPinataItems();
      fetchListedNFTs();
    }
  }, [currentView, isConnected]);

  // Update useEffect to check for stored NFT details
  useEffect(() => {
    const storedDetails = localStorage.getItem('lastBiddedNFT');
    const shouldSwitchToProfile = localStorage.getItem('switchToProfile') === 'true';
    
    if (shouldSwitchToProfile) {
      setIsProfileView(true);
      localStorage.removeItem('switchToProfile');
    }
    
    if (storedDetails && !isLoading) {
      try {
        const details = JSON.parse(storedDetails);
        // Find the NFT in our items that matches the stored details
        const matchingNFT = nftItems.find(item => 
          item.ipfs_pin_hash === details.ipfsHash && 
          item.tokenId?.toString() === details.tokenId?.toString()
        );
        
        if (matchingNFT) {
          console.log('Found matching NFT:', matchingNFT);
          setSelectedProduct(matchingNFT);
          // Clear the stored details after reopening
          localStorage.removeItem('lastBiddedNFT');
        } else {
          console.log('No matching NFT found in items:', nftItems);
        }
      } catch (error) {
        console.error('Error parsing stored NFT details:', error);
      }
    }
  }, [nftItems, isLoading]); // Add isLoading to dependencies

  // Add this near the other useEffect hooks
  useEffect(() => {
    const handleSwitchToProfile = (event: CustomEvent) => {
      setIsProfileView(true);
      loadPinataItems();
      fetchListedNFTs();
      if (event.detail?.nftDetails) {
        setSelectedProduct(event.detail.nftDetails);
      }
    };

    window.addEventListener('switchToProfileAndReload', handleSwitchToProfile as EventListener);
    
    return () => {
      window.removeEventListener('switchToProfileAndReload', handleSwitchToProfile as EventListener);
    };
  }, []);

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
        <SearchBar onSearch={handleSearch} />
      <div>
          <ul id="navbar">
            <button 
              className="cart-button"
              onClick={() => setIsCartOpen(!isCartOpen)}
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
              className={`profile-btn ${isProfileView ? 'active' : ''}`}
              onClick={async () => {
                if (!isConnected) {
                  setToastMessage('Please connect your wallet first');
                  setToastType('error');
                  setShowToast(true);
                  return;
                }
                setIsProfileView(!isProfileView);
                // Reset filters when toggling profile view
                setFilters(prev => ({
                  ...prev,
                  status: 'all',
                  owner: 'all'  // Reset owner filter to 'all'
                }));
                // Reload NFT items and listings every time the button is clicked
                await Promise.all([
                  loadPinataItems(),
                  fetchListedNFTs()
                ]);
              }}
            >
              <i className={`fas ${isProfileView ? 'fa-home' : 'fa-user'}`}></i>
              <span>{isProfileView ? 'Home' : 'Profile'}</span>
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
        <div className="main-container">
          <aside className="sidebar">
            {/* Profile Section */}
            {isProfileView && (
              <div className="filter-section">
                <h3>My Collection</h3>
                <p className="wallet-address">
                  {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}
                </p>
              </div>
            )}

            {/* Status Filter - Allows users to filter NFTs by status, Listed or Auction*/}
            <div className="filter-section">
              <h3 onClick={() => toggleSection('status')}>
                Status
                <i className={`fas fa-chevron-down ${collapsedSections.status ? 'rotated' : ''}`}></i>
              </h3>
              <div className={`filter-content ${collapsedSections.status ? 'collapsed' : 'expanded'}`}>
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
            </div>

            {/* Owner Filter - Allows users to filter NFTs by owner, All or My NFTs */}
            {!isProfileView && (
              <div className="filter-section">
                <h3 onClick={() => toggleSection('owner')}>
                  Owner
                  <i className={`fas fa-chevron-down ${collapsedSections.owner ? 'rotated' : ''}`}></i>
                </h3>
                <div className={`filter-content ${collapsedSections.owner ? 'collapsed' : 'expanded'}`}>
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
              </div>
            )}

            {/* Price Range Filter - Allows users to filter NFTs by price range */}
            <div className="filter-section">
              <h3 onClick={() => toggleSection('price')}>
                Price
                <i className={`fas fa-chevron-down ${collapsedSections.price ? 'rotated' : ''}`}></i>
              </h3>
              {/* Collapsible content for price range inputs */}
              <div className={`filter-content ${collapsedSections.price ? 'collapsed' : 'expanded'}`}>
                <div className="price-range">
                  {/* Minimum price input - Validates and updates price range filter */}
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="Min"
                    className="price-input"
                    value={priceInputs.min}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = parseFloat(value);
                      if (value === '' || (numValue >= 0)) {
                        setPriceInputs(prev => ({ ...prev, min: value }));
                        handlePriceRangeChange(
                          value ? numValue : null,
                          filters.priceRange.max
                        );
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e') {
                        e.preventDefault();
                      }
                    }}
                  />
                  <span>to</span>
                  {/* Maximum price input - Validates and updates price range filter */}
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="Max"
                    className="price-input"
                    value={priceInputs.max}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = parseFloat(value);
                      if (value === '' || (numValue >= 0)) {
                        setPriceInputs(prev => ({ ...prev, max: value }));
                        handlePriceRangeChange(
                          filters.priceRange.min,
                          value ? numValue : null
                        );
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e') {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Stats range filter - Allows users to filter NFTs by stats range */}
            <div className="filter-section">
              <h3 onClick={() => toggleSection('stats')}>
                Stats
                <i className={`fas fa-chevron-down ${collapsedSections.stats ? 'rotated' : ''}`}></i>
              </h3>
              <div className={`filter-content ${collapsedSections.stats ? 'collapsed' : 'expanded'}`}>
                {Object.entries(statsInputs).map(([stat, values]) => (
                  <div key={stat} className="stats-range">
                    <label className="stat-label">{stat.charAt(0).toUpperCase() + stat.slice(1)}</label>
                    <div className="stat-inputs">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Min"
                        className="stats-input"
                        value={values.min}
                        onChange={(e) => handleStatsRangeChange(stat as keyof typeof statsInputs, 'min', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e') {
                            e.preventDefault();
                          }
                        }}
                      />
                      <span>to</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Max"
                        className="stats-input"
                        value={values.max}
                        onChange={(e) => handleStatsRangeChange(stat as keyof typeof statsInputs, 'max', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e') {
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Traits Filter */}
            <div className="filter-section">
              <h3 onClick={() => toggleSection('traits')}>
                Traits
                <i className={`fas fa-chevron-down ${collapsedSections.traits ? 'rotated' : ''}`}></i>
              </h3>
              <div className={`filter-content ${collapsedSections.traits ? 'collapsed' : 'expanded'}`}>
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
            </div>
          </aside>

          <div className="content-area">
            <section id="product1" className="section-p1">
              <div className="pro-container">
                {isLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading NFTs...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="no-items-message">
                    No NFTs found
                  </div>
                ) : (
                  filteredItems.map((item) => (
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
                        <span className={`type-badge ${(item.metadata?.keyvalues?.Type || '').toLowerCase()}`}>{item.metadata?.keyvalues?.Type || 'Type'}</span>
                        <h5>{item.metadata?.name || 'Pokemon Card NFT'}</h5>
                        {item.price && (
                          <div className="price-tag">
                            <span>{item.price} ETH</span>
                          </div>
                        )}
                      </div>
                      <div className="button-group">
                        <div className="tooltip">
                          {!isProfileView ? (
                            <>
                              {!item.isAuction && (
                                <button
                                  className={`cart-button ${cartItems.some(cartItem => cartItem.id === item.ipfs_pin_hash) ? 'in-cart' : ''}`}
                                  onClick={(e) => handleCartClick(e, item)}
                                  disabled={item.seller?.toLowerCase() === account?.toLowerCase() || item.isAuction}
                                >
                                  <i className="fas fa-shopping-cart"></i>
                                </button>
                              )}
                              {item.isAuction ? (
                                <button 
                                  className="view-auction-button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCardClick(e, item);
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleCartClick(e, item, true);
                                    setIsCartOpen(true);
                                  }}
                                  disabled={item.seller?.toLowerCase() === account?.toLowerCase()}
                                >
                                  Buy Now
                                </button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* {isSearching && filteredItems.length === 0 && (
              <div className="no-results">
                <h2>No Pokemon NFT found</h2>
              </div>
            )} */}
          </div>
        </div>
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
            account={account}
            isProfileView={isProfileView}
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
