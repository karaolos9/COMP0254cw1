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
import { useAccount } from '@metamask/sdk-react-ui';
import { useSDK } from '@metamask/sdk-react-ui';

// Lazy load components
const CartPanel = lazy(() => import('./components/CartPanel'));

// Pinata item info
type PinataItem = ImportedPinataItem & {
  price?: string;
  seller?: string;
  tokenId?: string;
  isListed?: boolean;
  isAuction?: boolean;
  name: string;
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
  const { addToCart, removeFromCart, cartItems } = useCart();
  const { account, isConnecting: sdkIsConnecting } = useAccount();
  const { sdk, connected, connecting } = useSDK();
  const [nftItems, setNftItems] = useState<PinataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileView, setIsProfileView] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PinataItem | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [filteredItems, setFilteredItems] = useState<PinataItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [priceInputs, setPriceInputs] = useState({ min: '', max: '' });
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({});
  const [localAccount, setLocalAccount] = useState<string | null>(null);

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

  // Add debug logging for initial mount and state changes
  useEffect(() => {
    console.log('Initial mount - MetaMask state:', {
      account,
      connected,
      connecting,
      sdkIsConnecting,
      sdk: !!sdk
    });
  }, []);

  useEffect(() => {
    console.log('MetaMask state changed:', {
      account,
      connected,
      connecting,
      sdkIsConnecting,
      sdk: !!sdk
    });
  }, [account, connected, connecting, sdkIsConnecting, sdk]);

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
    if (!sdk) {
      setToastMessage('MetaMask SDK not initialized');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setIsConnecting(true);
    try {
      console.log('Starting wallet connection...');
      const accounts = await sdk.connect() as string[];
      const accountsArray = Array.isArray(accounts) ? accounts : [];
      
      console.log('Connect response:', { accounts, accountsArray });
      
      if (accountsArray.length === 0) {
        throw new Error('No accounts found');
      }

      // Get the current chain ID
      const currentChainId = await window.ethereum?.request({
        method: 'eth_chainId'
      });

      const targetChainId = NETWORK_CONFIG.chainId;
      console.log('Chain IDs:', { current: currentChainId, target: targetChainId });

      // Only switch if we're not already on the correct chain
      if (currentChainId !== targetChainId) {
        console.log('Switching network...');
        try {
          await window.ethereum?.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainId }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            console.log('Network not found, adding network...');
            try {
              await window.ethereum?.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: targetChainId,
                  chainName: NETWORK_CONFIG.chainName,
                  rpcUrls: NETWORK_CONFIG.rpcUrls,
                  nativeCurrency: NETWORK_CONFIG.nativeCurrency
                }],
              });
            } catch (addError: any) {
              console.error('Error adding network:', addError);
              throw new Error(`Failed to add network: ${addError.message}`);
            }
          } else {
            throw switchError;
          }
        }
      }

      // Clear cart items on successful connection
      cartItems.forEach(item => removeFromCart(item.id));

      // Wait for MetaMask state to update with retries
      console.log('Waiting for MetaMask state update...');
      let retries = 0;
      const maxRetries = 5;
      
      while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get fresh accounts
        const currentAccounts = await window.ethereum?.request({
          method: 'eth_accounts'
        }) as string[];
        
        console.log('Connection check attempt', retries + 1, {
          currentAccounts,
          sdkAccount: account,
          connected
        });

        if (currentAccounts?.[0] && connected) {
          // Force a provider refresh
          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const signerAddress = await signer.getAddress();
            console.log('Signer verified:', signerAddress);
            
            // Set local account
            setLocalAccount(signerAddress);
            
            // Update balance
            const balance = await provider.getBalance(signerAddress);
            setBalance(ethers.formatEther(balance));
          }
          break;
        }
        
        retries++;
        if (retries === maxRetries) {
          console.warn('Max retries reached waiting for account');
        }
      }

      // Load initial data
      console.log('Loading initial data...');
      await Promise.all([
        loadPinataItems(),
        fetchListedNFTs()
      ]);

      setToastMessage('Wallet connected successfully');
      setToastType('success');
      setShowToast(true);

    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      let errorMessage = 'Error connecting wallet';
      
      if (error.code === 4001) {
        errorMessage = 'You rejected the connection request';
      } else if (error.code === -32002) {
        errorMessage = 'Connection request already pending. Check MetaMask';
      } else if (error.code === 4902) {
        errorMessage = 'Network not configured in MetaMask';
      } else if (error.message) {
        errorMessage = error.message;
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
      setBalance(null);
      setIsProfileView(false);
      
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

  // Update the account effect to use localAccount
  useEffect(() => {
    console.log('Account state changed:', { account, localAccount, connected });
    
    if ((account || localAccount) && connected) {
      const currentAccount = account || localAccount;
      console.log('Using account:', currentAccount);
      
      // Load initial data when account is connected
      Promise.all([
        loadPinataItems(),
        fetchListedNFTs()
      ]).catch(console.error);

      // Update balance
      if (window.ethereum && currentAccount) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        provider.getBalance(currentAccount).then(balance => {
          setBalance(ethers.formatEther(balance));
        }).catch(console.error);
      }
    } else {
      // Reset states when disconnected
      setBalance(null);
      setIsProfileView(false);
      setLocalAccount(null);
    }
  }, [account, localAccount, connected]);

  // Handle chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = () => {
      setToastMessage('Network changed. Refreshing...');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => window.location.reload(), 2000);
    };

    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  // Initialization
  useEffect(() => {
    loadPinataItems();
    fetchListedNFTs();
  }, []);

  // Trading contract event listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const tradingContract = new ethers.Contract(
      CONTRACT_ADDRESSES.TRADING_CONTRACT,
      CONTRACT_ABIS.TRADING_CONTRACT,
      provider
    );

    // Set up event listeners with immediate data refresh
    const handleCardListed = async (tokenId: bigint, seller: string, price: bigint, isAuction: boolean) => {
      console.log('Card Listed event:', { tokenId, seller, price, isAuction });
      // Immediately fetch new listings as this is most relevant
      await fetchListedNFTs().catch(console.error);
      // Then update Pinata items in background
      loadPinataItems().catch(console.error);
    };

    const handleSaleCompleted = async (tokenId: bigint, buyer: string, price: bigint) => {
      console.log('Sale Completed event:', { tokenId, buyer, price });
      await fetchListedNFTs().catch(console.error);
      loadPinataItems().catch(console.error);
    };

    const handleAuctionBid = async (tokenId: bigint, bidder: string, amount: bigint) => {
      console.log('Auction Bid event:', { tokenId, bidder, amount });
      // For bids, we mainly need to update the listings
      await fetchListedNFTs().catch(console.error);
    };

    const handleAuctionEnded = async (tokenId: bigint, winner: string, amount: bigint) => {
      console.log('Auction Ended event:', { tokenId, winner, amount });
      // Immediately fetch new listings state
      await fetchListedNFTs().catch(console.error);
      // Then update Pinata items in background
      loadPinataItems().catch(console.error);
    };

    const handleListingCancelled = async (tokenId: bigint, seller: string) => {
      console.log('Listing Cancelled event:', { tokenId, seller });
      // Immediately fetch new listings state
      await fetchListedNFTs().catch(console.error);
      // Then update Pinata items in background
      loadPinataItems().catch(console.error);
    };

    // Listen to events emitted in real time
    tradingContract.on('CardListed', handleCardListed);
    tradingContract.on('SaleCompleted', handleSaleCompleted);
    tradingContract.on('AuctionBid', handleAuctionBid);
    tradingContract.on('AuctionEnded', handleAuctionEnded);
    tradingContract.on('ListingCancelled', handleListingCancelled);

    // Cleanup function to remove event listeners
    return () => {
      tradingContract.off('CardListed', handleCardListed);
      tradingContract.off('SaleCompleted', handleSaleCompleted);
      tradingContract.off('AuctionBid', handleAuctionBid);
      tradingContract.off('AuctionEnded', handleAuctionEnded);
      tradingContract.off('ListingCancelled', handleListingCancelled);
    };
  }, []);

  // // Update type handling in state updates
  // const setNftItemsWithTypes = (items: PinataItem[]) => {
  //   setNftItems(items.map(item => ({
  //     ...item,
  //     price: item.price || undefined,
  //     seller: item.seller || undefined,
  //     tokenId: item.tokenId || undefined,
  //     isListed: item.isListed || false,
  //     isAuction: item.isAuction || false
  //   })));
  // };

  // Update the checkNFTOwnership function to handle types properly
  const checkNFTOwnership = async (items: PinataItem[]) => {
    const currentAccount = account || localAccount;
    console.log('Checking NFT ownership with account:', currentAccount);
    
    if (!window.ethereum || !currentAccount) {
      console.log('No ethereum or account available');
      return items;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const nftContract = new ethers.Contract(
        CONTRACT_ADDRESSES.NFT_CONTRACT,
        CONTRACT_ABIS.NFT_CONTRACT,
        provider
      );

      const totalTokens = await nftContract.cardIdCounter();
      console.log('Total tokens:', totalTokens.toString());

      const checkedItems = await Promise.all(items.map(async (item) => {
        try {
          console.log('Checking item:', item.name);
          for (let tokenId = 1; tokenId <= totalTokens; tokenId++) {
            try {
              const uri = await nftContract.tokenURI(tokenId);
              const owner = await nftContract.ownerOf(tokenId);
              
              const cleanUri = uri.replace('ipfs://', '');
              const cleanHash = item.ipfs_pin_hash;
              
              console.log(`Token ${tokenId}:`, {
                cleanUri,
                cleanHash,
                owner,
                currentAccount,
                matches: cleanUri === cleanHash
              });
              
              if (cleanUri === cleanHash) {
                console.log(`Found match for ${item.name} - Token ID: ${tokenId}, Owner: ${owner}`);
                return {
                  ...item,
                  isOwned: owner.toLowerCase() === currentAccount.toLowerCase(),
                  tokenId: tokenId.toString()
                };
              }
            } catch (e) {
              // Only log if it's not a "token doesn't exist" error
              if (!e.message.includes('nonexistent token')) {
                console.error(`Error checking token ${tokenId}:`, e);
              }
              continue;
            }
          }
          console.log(`No token ID found for item: ${item.name}`);
          return { ...item, isOwned: false, tokenId: undefined };
        } catch (error) {
          console.error('Error checking ownership for item:', item.name, error);
          return item;
        }
      }));

      console.log('Ownership check complete. Results:', checkedItems);
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
    if (account && currentView === 'profile') {
      console.log("View changed to profile, reloading items");
      loadPinataItems();
      fetchListedNFTs();
    }
  }, [currentView, account]);

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

  // Update profile button click handler
  const handleProfileClick = async () => {
    const currentAccount = account || localAccount;
    console.log('Profile click - Current state:', {
      account,
      localAccount,
      connected,
      isProfileView,
      sdk: !!sdk
    });
    
    if (!currentAccount || !connected) {
      console.log('Profile access denied - not connected');
      setToastMessage('Please connect your wallet first');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setIsProfileView(!isProfileView);
    setCurrentView(isProfileView ? 'main' : 'profile');
    
    // Reset filters when toggling profile view
    setFilters(prev => ({
      ...prev,
      status: 'all',
      owner: 'all'
    }));

    // Reload NFT items and listings
    try {
      console.log('Loading profile data...');
      await Promise.all([
        loadPinataItems(),
        fetchListedNFTs()
      ]);
      console.log('Profile data loaded successfully');
    } catch (error) {
      console.error('Error loading profile data:', error);
      setToastMessage('Error loading profile data');
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
              {!account && !localAccount || !connected ? (
                <button 
                  onClick={connectWallet} 
                  disabled={isConnecting || sdkIsConnecting || connecting} 
                  className="wallet-button"
                >
                  <i className="fas fa-wallet"></i>
                  <span>
                    {isConnecting || sdkIsConnecting || connecting ? 'Connecting...' : 'Connect'}
                  </span>
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
                        <p>{(account || localAccount)?.slice(0, 6)}...{(account || localAccount)?.slice(-4)}</p>
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
              onClick={handleProfileClick}
              disabled={(!account && !localAccount) || !connected}
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
                  {(account || localAccount) ? 
                    `${(account || localAccount).slice(0, 6)}...${(account || localAccount).slice(-4)}` : 
                    'Not connected'
                  }
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
          url: window.location.href,
        },
        checkInstallationImmediately: true
      }}
    >
      <AppContent />
    </MetaMaskUIProvider>
  )
}

export default App
