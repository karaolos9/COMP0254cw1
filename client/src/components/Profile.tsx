import React, { useState, useEffect } from 'react';
import { PinataImage } from './PinataImage';
import ProfileCardDetails from './ProfileCardDetails';
import { PinataItem } from '../types';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config';

interface ProfileProps {
  nftItems: PinataItem[];
  account: string | null;
}

type StatusFilter = 'all' | 'listed' | 'auction' | 'not-listed';

const Profile: React.FC<ProfileProps> = ({ nftItems, account }) => {
  const [selectedCard, setSelectedCard] = useState<PinataItem | null>(null);
  const [displayedNFTs, setDisplayedNFTs] = useState<PinataItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    const filterNFTs = async () => {
      if (!window.ethereum || !account || nftItems.length === 0) {
        setDisplayedNFTs([]);
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accountLower = account.toLowerCase();
        
        // Step 1: Get contract instances
        const tradingContract = new ethers.Contract(
          CONTRACT_ADDRESSES.TRADING_CONTRACT,
          CONTRACT_ABIS.TRADING_CONTRACT,
          provider
        );
        const nftContract = new ethers.Contract(
          CONTRACT_ADDRESSES.NFT_CONTRACT,
          CONTRACT_ABIS.NFT_CONTRACT,
          provider
        );

        // Step 2: Get total tokens and build IPFS mapping
        const totalTokens = await nftContract.cardIdCounter();
        console.log('Total tokens:', totalTokens.toString());
        
        // Create maps for token tracking
        const tokenToIpfsMap = new Map<string, string>();
        const ipfsToTokenId = new Map<string, string>();
        const nftStatuses = new Map<string, { 
          tokenId: string;
          isListed: boolean; 
          isAuction: boolean; 
          seller: string;
          isMyListing: boolean;
          isOwned: boolean;
        }>();

        // Create a map to store additional NFT items we discover
        const additionalNFTs = new Map<string, PinataItem>();

        // First, build a set of all IPFS hashes we have in nftItems
        const availableIpfsHashes = new Set(nftItems.map(item => item.ipfs_pin_hash));
        console.log('Available IPFS hashes:', Array.from(availableIpfsHashes));

        // Step 3: Check all tokens for listings and ownership
        for (let i = 1; i <= totalTokens; i++) {
          try {
            const tokenId = i.toString();
            
            // First check if this token is listed in the trading contract
            const listing = await tradingContract.listings(tokenId);
            const sellerLower = listing.seller.toLowerCase();
            const isMyListing = sellerLower === accountLower;
            const isListed = listing.isActive;

            // Get the IPFS hash for this token
            let ipfsHash = '';
            try {
              const tokenURI = await nftContract.tokenURI(i);
              ipfsHash = tokenURI.replace('ipfs://', '');
            } catch (error) {
              console.log(`Token ${i} URI not available`);
              continue;
            }

            // Process if:
            // 1. The token is actively listed and I'm the seller, OR
            // 2. The token's IPFS hash is in our available hashes
            const shouldProcess = (isListed && isMyListing) || availableIpfsHashes.has(ipfsHash);

            if (shouldProcess) {
              // Get current owner
              const owner = await nftContract.ownerOf(i);
              const ownerLower = owner.toLowerCase();
              const isInTradingContract = ownerLower === CONTRACT_ADDRESSES.TRADING_CONTRACT.toLowerCase();
              const isOwned = ownerLower === accountLower;

              console.log(`Token ${tokenId} detailed status:`, {
                tokenId,
                ipfsHash,
                owner: ownerLower,
                accountLower,
                isInTradingContract,
                isOwned,
                listing: {
                  isActive: listing.isActive,
                  seller: sellerLower,
                  isAuction: listing.isAuction,
                  price: listing.price?.toString(),
                  isMyListing
                }
              });

              // If this is my listing but not in nftItems, create a new item for it
              if (isListed && isMyListing && !availableIpfsHashes.has(ipfsHash)) {
                // Create a basic PinataItem for this NFT
                const fetchPinataMetadata = async () => {
                  try {
                    const response = await fetch(`/api/pinata/data/pinList?hashContains=${ipfsHash}`, {
                      headers: {
                        'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT_ADMIN}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      const pinataItem = data.rows?.[0];
                      if (pinataItem?.metadata) {
                        return pinataItem.metadata;
                      }
                    }
                  } catch (error) {
                    console.error(`Error fetching Pinata metadata for token ${tokenId}:`, error);
                  }
                  return {
                    name: `Token #${tokenId}`,
                    keyvalues: {
                      Type: 'Unknown'
                    }
                  };
                };

                const metadata = await fetchPinataMetadata();
                additionalNFTs.set(ipfsHash, {
                  ipfs_pin_hash: ipfsHash,
                  metadata
                });
                console.log(`Added additional NFT for token ${tokenId}:`, { ipfsHash, metadata });
              }

              tokenToIpfsMap.set(tokenId, ipfsHash);
              ipfsToTokenId.set(ipfsHash, tokenId);

              // Store the status
              nftStatuses.set(ipfsHash, {
                tokenId,
                isListed,
                isAuction: listing.isAuction,
                seller: sellerLower,
                isMyListing,
                isOwned: isOwned || (isInTradingContract && isMyListing)
              });
            }
          } catch (error) {
            console.error(`Error processing token ${i}:`, error);
          }
        }

        // Log the mappings for debugging
        console.log('Token to IPFS mapping:', Object.fromEntries(tokenToIpfsMap));
        console.log('IPFS to Token mapping:', Object.fromEntries(ipfsToTokenId));
        console.log('NFT Statuses:', Object.fromEntries(nftStatuses));
        console.log('Additional NFTs:', Object.fromEntries(additionalNFTs));

        // Step 4: Filter NFTs based on status
        // Combine original nftItems with additional NFTs we discovered
        const allNFTs = [...nftItems, ...Array.from(additionalNFTs.values())];
        const filteredNFTs = allNFTs.filter(item => {
          const status = nftStatuses.get(item.ipfs_pin_hash);
          const tokenId = ipfsToTokenId.get(item.ipfs_pin_hash);
          
          // Add status to item for UI and future reference
          if (status) {
            item.isListed = status.isListed;
            item.isAuction = status.isAuction;
            item.seller = status.seller;
            item.isOwned = status.isOwned;
            item.tokenId = status.tokenId;
          }

          console.log('Processing NFT for display:', {
            name: item.metadata?.name,
            ipfsHash: item.ipfs_pin_hash,
            tokenId,
            currentFilter: statusFilter,
            status: status ? {
              isListed: status.isListed,
              isAuction: status.isAuction,
              isMyListing: status.isMyListing,
              seller: status.seller,
              isOwned: status.isOwned
            } : 'No status found'
          });

          if (!status) {
            console.log(`No status found for NFT ${item.metadata?.name}`);
            return false;
          }

          // Determine if NFT should be included based on filter
          switch (statusFilter) {
            case 'all':
              // Show if I own it directly OR if it's my active listing in the trading contract
              const shouldInclude = status.isOwned || (status.isListed && status.isMyListing);
              const reason = status.isOwned ? 'owned by me' : 
                           (status.isListed && status.isMyListing ? 'active listing by me' : 
                           'not owned or listed by me');
              console.log(`${shouldInclude ? 'Including' : 'Excluding'} ${item.metadata?.name}:`, {
                reason,
                tokenId,
                isOwned: status.isOwned,
                isListed: status.isListed,
                isMyListing: status.isMyListing,
                seller: status.seller
              });
              return shouldInclude;

            case 'listed':
              // Show only my active direct sale listings
              const isMyDirectSale = status.isListed && status.isMyListing && !status.isAuction;
              console.log(`${isMyDirectSale ? 'Including' : 'Excluding'} ${item.metadata?.name} from listed:`, {
                isMyListing: status.isMyListing,
                isListed: status.isListed,
                isAuction: status.isAuction,
                seller: status.seller
              });
              return isMyDirectSale;

            case 'auction':
              // Show only my active auction listings
              const isMyAuction = status.isListed && status.isMyListing && status.isAuction;
              console.log(`${isMyAuction ? 'Including' : 'Excluding'} ${item.metadata?.name} from auction:`, {
                isMyListing: status.isMyListing,
                isListed: status.isListed,
                isAuction: status.isAuction,
                seller: status.seller
              });
              return isMyAuction;

            case 'not-listed':
              // Show only NFTs I own directly (in my wallet)
              const isOwnedDirectly = status.isOwned && !status.isListed;
              console.log(`${isOwnedDirectly ? 'Including' : 'Excluding'} ${item.metadata?.name} from not-listed:`, {
                isOwned: status.isOwned,
                isListed: status.isListed,
                seller: status.seller
              });
              return isOwnedDirectly;

            default:
              return false;
          }
        });

        console.log('Final filtered NFTs:', filteredNFTs.map(nft => ({
          name: nft.metadata?.name,
          ipfsHash: nft.ipfs_pin_hash,
          tokenId: nft.tokenId,
          status: nftStatuses.get(nft.ipfs_pin_hash)
        })));

        setDisplayedNFTs(filteredNFTs);
      } catch (error) {
        console.error('Error filtering NFTs:', error);
      }
    };

    filterNFTs();
  }, [nftItems, account, statusFilter]);

  return (
    <div className="main-container">
      <aside className="sidebar">
        <div className="filter-section">
          <h3>My Collection</h3>
          <p className="wallet-address">
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}
          </p>
        </div>

        <div className="filter-section">
          <h3>Status</h3>
          <div className="filter-option">
            <input
              type="radio"
              id="status-all"
              name="status"
              checked={statusFilter === 'all'}
              onChange={() => setStatusFilter('all')}
            />
            <label htmlFor="status-all">All</label>
          </div>
          <div className="filter-option">
            <input
              type="radio"
              id="status-listed"
              name="status"
              checked={statusFilter === 'listed'}
              onChange={() => setStatusFilter('listed')}
            />
            <label htmlFor="status-listed">Listed</label>
          </div>
          <div className="filter-option">
            <input
              type="radio"
              id="status-auction"
              name="status"
              checked={statusFilter === 'auction'}
              onChange={() => setStatusFilter('auction')}
            />
            <label htmlFor="status-auction">On Auction</label>
          </div>
          <div className="filter-option">
            <input
              type="radio"
              id="status-not-listed"
              name="status"
              checked={statusFilter === 'not-listed'}
              onChange={() => setStatusFilter('not-listed')}
            />
            <label htmlFor="status-not-listed">Not Listed</label>
          </div>
        </div>
      </aside>

      <div className="content-area">
        <section id="product1" className="section-p1">
          <div className="pro-container">
            {displayedNFTs.length === 0 ? (
              <div>No NFTs found</div>
            ) : (
              displayedNFTs.map((item) => (
                <div 
                  key={item.ipfs_pin_hash} 
                  className="pro profile-card"
                  onClick={() => setSelectedCard(item)}
                >
                  <PinataImage 
                    hash={item.ipfs_pin_hash}
                    alt="NFT Item"
                  />
                  <div className="des">
                    <span>{item.metadata?.keyvalues?.Type || 'Type'}</span>
                    <div className="name-price">
                      <h5>{item.metadata?.name || 'Pokemon Card NFT'}</h5>
                      <p className="price">
                        {item.price ? `${item.price} ETH` : '0.001 ETH'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      {selectedCard && (
        <ProfileCardDetails
          ipfsHash={selectedCard.ipfs_pin_hash}
          metadata={selectedCard.metadata}
          onClose={() => setSelectedCard(null)}
          account={account}
        />
      )}
    </div>
  );
};

export default Profile; 