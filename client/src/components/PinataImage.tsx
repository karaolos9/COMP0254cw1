import React, { useState } from 'react';

interface PinataImageProps {
  hash: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export function PinataImage({ hash, alt, className, style }: PinataImageProps) {
  const [imageError, setImageError] = useState(false);
  // const fallbackImage = '/img/poke_ball.png'; // Your fallback image
  
  const pinataUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
  const backupUrl = `https://ipfs.io/ipfs/${hash}`;

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
    }
  };

  return (
    <img
      src={imageError ? backupUrl : pinataUrl}
      alt={alt}
      className={className}
      style={style}
      onError={handleImageError}
      onLoad={() => setImageError(false)}
    />
  );
} 