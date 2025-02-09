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

        const totalTokens = await nftContract.cardIdCounter();
        const nftStatuses = new Map<string, { isListed: boolean; isAuction: boolean }>();

        // Check each token's status
        for (let i = 1; i <= totalTokens; i++) {
          try {
            const uri = await nftContract.tokenURI(i);
            const cleanUri = uri.replace('ipfs://', '');
            const listing = await tradingContract.listings(i);
            
            if (listing.isActive && listing.seller.toLowerCase() === account.toLowerCase()) {
              nftStatuses.set(cleanUri, {
                isListed: true,
                isAuction: listing.isAuction
              });
            }
          } catch (error) {
            console.error(`Error checking token ${i}:`, error);
          }
        }

        // Filter NFTs based on status
        const filteredNFTs = nftItems.filter(item => {
          const status = nftStatuses.get(item.ipfs_pin_hash);
          const isOwned = item.isOwned;
          
          switch (statusFilter) {
            case 'all':
              return isOwned || status?.isListed;
            case 'listed':
              return status?.isListed && !status?.isAuction;
            case 'auction':
              return status?.isAuction;
            case 'not-listed':
              return isOwned && !status?.isListed;
            default:
              return false;
          }
        });

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