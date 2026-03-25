'use client';

import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { formatCents } from '@/lib/money';

type BidUpdateEvent = CustomEvent<{
  auctionId?: string;
  amount?: number;
}>;

export function CurrentPrice({ auctionID, initialPrice }: { auctionID: string; initialPrice: number }) {
  const [price, setPrice] = useState<number>(initialPrice);

  useEffect(() => {
    setPrice(initialPrice);
  }, [initialPrice]);

  useEffect(() => {
    const handleBidUpdate = (event: Event) => {
      const custom = event as BidUpdateEvent;
      if (custom.detail?.auctionId !== auctionID) return;
      if (typeof custom.detail?.amount === 'number') {
        setPrice(custom.detail.amount);
      }
    };

    window.addEventListener('auction:bid-update', handleBidUpdate);
    return () => window.removeEventListener('auction:bid-update', handleBidUpdate);
  }, [auctionID]);

  return (
    <Typography variant="h3" color="primary.main" sx={{ mt: 1, fontWeight: 700 }}>
      {formatCents(price)}
    </Typography>
  );
}
