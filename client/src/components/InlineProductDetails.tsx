import React from 'react';
import { PinataImage } from './PinataImage';
import '../styles/InlineProductDetails.css';

interface InlineProductDetailsProps {
  ipfsHash: string;
  metadata?: {
    name?: string;
    keyvalues?: {
      Type?: string;
    };
  };
  onClose: () => void;
}

export function InlineProductDetails({ ipfsHash, metadata, onClose }: InlineProductDetailsProps) {
  return (
    <div className="product-details-overlay">
      <div className="product-details-container">
        <button className="close-details" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className="product-details-content">
          <div className="product-image">
            <PinataImage hash={ipfsHash} alt={metadata?.name || 'Pokemon Card'} />
          </div>
          
          <div className="product-info">
            <h2>{metadata?.name || 'Pokemon Card NFT'}</h2>
            <div className="product-type">
              <span className={`type-badge ${(metadata?.keyvalues?.Type || '').toLowerCase()}`}>
                {metadata?.keyvalues?.Type || 'Type'}
              </span>
            </div>
            <div className="product-price">
              <h3>Price:</h3>
              <span>0.1 ETH</span>
            </div>
            <div className="product-description">
              <h3>Description:</h3>
              <p>A rare Pokemon NFT card featuring {metadata?.name}. This digital collectible is perfect for Pokemon enthusiasts and NFT collectors alike.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 