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
    const checkOwnershipAndPrices = async () => {
      if (!window.ethereum || !account || nftItems.length === 0) {
        setDisplayedNFTs([]);
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const nftContract = new ethers.Contract(
          CONTRACT_ADDRESSES.NFT_CONTRACT,
          CONTRACT_ABIS.NFT_CONTRACT,
          provider
        );
        const tradingContract = new ethers.Contract(
          CONTRACT_ADDRESSES.TRADING_CONTRACT,
          CONTRACT_ABIS.TRADING_CONTRACT,
          provider
        );

        const totalTokens = await nftContract.cardIdCounter();
        const userNFTs = new Map<string, { price?: string, isListed: boolean }>();

        // Check each token
        for (let i = 1; i <= totalTokens; i++) {
          try {
            const uri = await nftContract.tokenURI(i);
            const cleanUri = uri.replace('ipfs://', '');
            
            // Check if user is the owner
            const owner = await nftContract.ownerOf(i);
            
            if (owner.toLowerCase() === account.toLowerCase()) {
              // Check if the NFT is listed and get its price
              const listing = await tradingContract.listings(i);
              const price = listing.isActive ? ethers.formatEther(listing.price) : undefined;
              
              userNFTs.set(cleanUri, {
                price,
                isListed: listing.isActive
              });
              console.log(`Found owned NFT: ${cleanUri}, Price: ${price}, Listed: ${listing.isActive}`);
            }
          } catch (error) {
            console.error(`Error checking token ${i}:`, error);
          }
        }

        // Filter and enhance nftItems with price information
        const filteredNFTs = nftItems
          .filter(item => userNFTs.has(item.ipfs_pin_hash))
          .map(item => ({
            ...item,
            ...userNFTs.get(item.ipfs_pin_hash)
          }));

        console.log('Total NFTs found:', filteredNFTs.length);
        console.log('Filtered NFTs:', filteredNFTs);
        setDisplayedNFTs(filteredNFTs);
      } catch (error) {
        console.error('Error checking ownership and prices:', error);
      }
    };

    checkOwnershipAndPrices();
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