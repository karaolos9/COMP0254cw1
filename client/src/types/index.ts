export interface PinataItem {
  ipfs_pin_hash: string;
  metadata?: {
    name?: string;
    keyvalues?: {
      Type?: string;
      Rarity?: string;
      Generation?: string;
      Move1?: string;
      Move2?: string;
    };
  };
  isOwned?: boolean;
} 