import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Add styles at the top of the file
const styles = `
.main-container {
  display: flex;
  min-height: 100vh;
  padding: 20px;
  gap: 20px;
}

.sidebar {
  width: 250px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filter-section {
  margin-bottom: 24px;
}

.filter-section h3 {
  margin-bottom: 12px;
  color: #333;
  font-size: 1.1em;
}

.filter-option {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.filter-option input[type="radio"] {
  margin-right: 8px;
}

.filter-option label {
  color: #555;
  cursor: pointer;
}

.filter-option input[type="radio"]:disabled + label {
  color: #999;
  cursor: not-allowed;
}

.content-area {
  flex: 1;
  padding: 20px;
}

.pro-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.pro {
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
  cursor: pointer;
}

.pro:hover {
  transform: translateY(-5px);
}

.des {
  padding: 10px;
}

.price-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.auction-badge {
  background: #ff6b6b;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8em;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.cart-button,
.buy-now-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cart-button {
  background: #e9ecef;
}

.buy-now-button {
  background: #4dabf7;
  color: white;
  flex: 1;
}

.cart-button:hover {
  background: #dee2e6;
}

.buy-now-button:hover {
  background: #339af0;
}

.no-items-message {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 1.2em;
}

.cancel-listing-button {
  width: 100%;
  padding: 8px 16px;
  background-color: #ff4d4d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-weight: 500;
}

.cancel-listing-button:hover {
  background-color: #ff3333;
}
`;

// Add the style tag to the document
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const App: React.FC = () => {
  const [listedNFTs, setListedNFTs] = useState<NFTListing[]>([]);
  const [currentView, setCurrentView] = useState<string>('main');
  const [nftItems, setNFTItems] = useState<NFTItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<NFTItem[]>([]);
  const [currentItems, setCurrentItems] = useState<NFTItem[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [account, setAccount] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ owner: string; status: string }>({ owner: 'all', status: 'all' });
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const fetchListedNFTs = async () => {
    if (!window.ethereum) {
      console.log("MetaMask not found, cannot fetch listings");
      return;
    }
    
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
            // Check if the listing is still active
            const listing = await tradingContract.listings(tokenId);
            if (!listing.isActive) {
              console.log("Listing not active for tokenId:", tokenId.toString());
              return null;
            }
            
            // Get the IPFS hash for this token
            const tokenURI = await nftContract.tokenURI(tokenId);
            const ipfsHash = tokenURI.replace('ipfs://', '');
            console.log("Token", tokenId.toString(), "has IPFS hash:", ipfsHash);
            
            return {
              tokenId: tokenId.toString(),
              ipfsHash,
              price: ethers.formatEther(price),
              seller,
              isAuction,
            };
          } catch (error) {
            console.error("Error processing listing for token", tokenId.toString(), ":", error);
            return null;
          }
        })
      );

      // Filter out null values (inactive listings)
      const filteredListings = activeListings.filter((listing): listing is NFTListing => listing !== null);
      console.log("Active listings found:", filteredListings);
      setListedNFTs(filteredListings);
      return filteredListings; // Return the listings for immediate use
    } catch (error) {
      console.error("Error fetching listed NFTs:", error);
      return [];
    }
  };

  const loadPinataItems = async (activeListings: NFTListing[]) => {
    try {
      const data = await fetchPinataItems();
      console.log("Fetched Pinata items:", data.rows.length);
      console.log("Active listings to match:", activeListings);
      
      if (!data.rows || data.rows.length === 0) {
        console.log("No Pinata items found");
        setNftItems([]);
        setFilteredItems([]);
        return;
      }

      // Map Pinata items to include listing information
      const itemsWithListingInfo = data.rows.map(item => {
        const listing = activeListings.find(nft => {
          const match = nft.ipfsHash === item.ipfs_pin_hash;
          console.log("Comparing hashes:", {
            pinataHash: item.ipfs_pin_hash,
            listingHash: nft.ipfsHash,
            matches: match
          });
          return match;
        });

        return {
          ...item,
          price: listing?.price || null,
          seller: listing?.seller || null,
          tokenId: listing ? parseInt(listing.tokenId) : null,
          isAuction: listing?.isAuction || false,
          isListed: !!listing
        };
      });

      // Log all items that are marked as listed
      const listedItems = itemsWithListingInfo.filter(item => item.isListed);
      console.log("Listed items found:", listedItems.length);
      console.log("Listed items details:", listedItems);
      
      setNftItems(itemsWithListingInfo);
      setFilteredItems(listedItems); // Initially show all listed items
      setCurrentItems(listedItems.slice(0, itemsPerPage));
      setTotalPages(Math.ceil(listedItems.length / itemsPerPage));
    } catch (error) {
      console.error("Error loading Pinata items:", error);
      setToastMessage('Error loading NFTs');
      setToastType('error');
      setShowToast(true);
    }
  };

  /* Initialization */
  useEffect(() => {
    const init = async () => {
      try {
        const activeListings = await fetchListedNFTs();
        console.log("Active listings before loading Pinata:", activeListings);
        await loadPinataItems(activeListings);
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };
    
    init();
  }, []);

  // Reload when account changes
  useEffect(() => {
    if (account) {
      console.log("Account changed, reloading items for:", account);
      const reload = async () => {
        const activeListings = await fetchListedNFTs();
        await loadPinataItems(activeListings);
      };
      reload();
    }
  }, [account]);

  // Update the filtering logic
  useEffect(() => {
    if (currentView === 'main') {
      console.log("Starting filtering with:", {
        totalItems: nftItems.length,
        listedNFTs: listedNFTs.length,
        filters,
        account
      });

      // Start with all items that are listed
      let displayItems = nftItems.filter(item => {
        const isListed = item.isListed;
        console.log("Checking item:", {
          hash: item.ipfs_pin_hash,
          isListed,
          price: item.price,
          seller: item.seller
        });
        return isListed;
      });
      console.log("Initial listed items:", displayItems.length);

      // Apply status filter
      if (filters.status === 'listed') {
        displayItems = displayItems.filter(item => !item.isAuction);
        console.log("After listed-only filter:", displayItems.length);
      } else if (filters.status === 'auction') {
        displayItems = displayItems.filter(item => item.isAuction);
        console.log("After auction-only filter:", displayItems.length);
      }

      // Apply owner filter
      if (filters.owner === 'me' && account) {
        displayItems = displayItems.filter(item => {
          const isOwner = item.seller?.toLowerCase() === account.toLowerCase();
          console.log("Checking ownership:", {
            itemSeller: item.seller,
            account,
            isOwner
          });
          return isOwner;
        });
        console.log("After owner filter:", displayItems.length);
      }

      console.log("Final display items:", displayItems);
      
      setFilteredItems(displayItems);
      setCurrentItems(displayItems.slice(0, itemsPerPage));
      setTotalPages(Math.ceil(displayItems.length / itemsPerPage));
    }
  }, [currentView, nftItems, listedNFTs, account, filters.status, filters.owner]);

  return (
    <div className="main-container">
      <aside className="sidebar">
        <div className="filter-section">
          <h3>Status</h3>
          <div className="filter-option">
            <input
              type="radio"
              id="status-all"
              name="status"
              checked={filters.status === 'all'}
              onChange={() => setFilters(prev => ({ ...prev, status: 'all' }))}
            />
            <label htmlFor="status-all">All</label>
          </div>
          <div className="filter-option">
            <input
              type="radio"
              id="status-listed"
              name="status"
              checked={filters.status === 'listed'}
              onChange={() => setFilters(prev => ({ ...prev, status: 'listed' }))}
            />
            <label htmlFor="status-listed">Listed</label>
          </div>
          <div className="filter-option">
            <input
              type="radio"
              id="status-auction"
              name="status"
              checked={filters.status === 'auction'}
              onChange={() => setFilters(prev => ({ ...prev, status: 'auction' }))}
            />
            <label htmlFor="status-auction">On Auction</label>
          </div>
        </div>

        <div className="filter-section">
          <h3>Owner</h3>
          <div className="filter-option">
            <input
              type="radio"
              id="owner-all"
              name="owner"
              checked={filters.owner === 'all'}
              onChange={() => setFilters(prev => ({ ...prev, owner: 'all' }))}
            />
            <label htmlFor="owner-all">All</label>
          </div>
          <div className="filter-option">
            <input
              type="radio"
              id="owner-me"
              name="owner"
              checked={filters.owner === 'me'}
              onChange={() => setFilters(prev => ({ ...prev, owner: 'me' }))}
              disabled={!account}
            />
            <label htmlFor="owner-me">My NFTs</label>
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
                    {item.seller?.toLowerCase() === account?.toLowerCase() ? (
                      <button 
                        className="cancel-listing-button"
                        onClick={(e) => handleCancelListing(e, item)}
                      >
                        Cancel Listing
                      </button>
                    ) : (
                      <>
                        <button 
                          className="cart-button"
                          onClick={(e) => handleCartClick(e, item)}
                        >
                          <i className="fas fa-shopping-cart"></i>
                        </button>
                        <button 
                          className="buy-now-button"
                          onClick={(e) => handleBuyNow(e, item)}
                        >
                          Buy Now
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default App; 