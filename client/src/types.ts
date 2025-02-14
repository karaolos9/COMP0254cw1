export interface PinataMetadata {
  name?: string;
  keyvalues?: {
    Type?: string;
    Rarity?: string;
    Generation?: string;
    Move1?: string;
    Move2?: string;
    HP?: string;
    Attack?: string;
    Defense?: string;
    Speed?: string;
    Special?: string;
  };
}

export interface PinataItem {
  ipfs_pin_hash: string;
  metadata?: PinataMetadata;
  isOwned?: boolean;
  price?: string;
  seller?: string;
  tokenId?: string;
  isListed?: boolean;
  isAuction?: boolean;
} 