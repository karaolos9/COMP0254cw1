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

interface NFTWithPrice extends PinataItem {
  price?: string;
  isListed?: boolean;
}

const Profile: React.FC<ProfileProps> = ({ nftItems, account }) => {
  console.log('Profile props:', { nftItems, account }); // Debug log
  const [selectedCard, setSelectedCard] = useState<NFTWithPrice | null>(null);
  const [displayedNFTs, setDisplayedNFTs] = useState<NFTWithPrice[]>([]);

  useEffect(() => {
    const checkListedNFTs = async () => {
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
        const userListings = new Map<string, { price: string, isListed: boolean }>();

        // Check each token
        for (let i = 1; i <= totalTokens; i++) {
          try {
            // Get the listing information
            const listing = await tradingContract.listings(i);
            
            // Check if the NFT is listed by the current user
            if (listing.isActive && listing.seller.toLowerCase() === account.toLowerCase()) {
              const uri = await nftContract.tokenURI(i);
              const cleanUri = uri.replace('ipfs://', '');
              
              userListings.set(cleanUri, {
                price: ethers.formatEther(listing.price),
                isListed: true
              });
              console.log(`Found listed NFT: ${cleanUri}, Price: ${ethers.formatEther(listing.price)}`);
            }
          } catch (error) {
            console.error(`Error checking token ${i}:`, error);
          }
        }

        // Filter and enhance nftItems with price information
        const filteredNFTs = nftItems
          .filter(item => userListings.has(item.ipfs_pin_hash))
          .map(item => ({
            ...item,
            ...userListings.get(item.ipfs_pin_hash)
          }));

        console.log('Total listed NFTs found:', filteredNFTs.length);
        console.log('Filtered NFTs:', filteredNFTs);
        setDisplayedNFTs(filteredNFTs);
      } catch (error) {
        console.error('Error checking listings:', error);
      }
    };

    checkListedNFTs();
  }, [nftItems, account]);

  return (
    <div className="main-container">
      <aside className="sidebar">
        <div className="filter-section">
          <h3>My Collection</h3>
          <p className="wallet-address">
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}
          </p>
        </div>
      </aside>

      <div className="content-area">
        <section id="product1" className="section-p1">
          <div className="pro-container">
            {displayedNFTs.length === 0 ? (
              <div>No NFTs owned yet</div>
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
                      {item.isListed && (
                        <p className="price">{item.price} ETH</p>
                      )}
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