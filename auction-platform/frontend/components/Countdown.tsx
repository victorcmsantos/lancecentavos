'use client';

import { Chip } from '@mui/material';
import { useEffect, useState } from 'react';

function formatSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

type BidUpdateEvent = CustomEvent<{
  auctionId?: string;
  endTime?: string;
  serverTimeUnix?: number;
}>;

export function Countdown({ auctionID, endTime, serverTimeUnix }: { auctionID: string; endTime?: string; serverTimeUnix: number }) {
  const [remaining, setRemaining] = useState<number>(0);
  const [liveEndTime, setLiveEndTime] = useState<string | undefined>(endTime);
  const [liveServerTimeUnix, setLiveServerTimeUnix] = useState<number>(serverTimeUnix);

  useEffect(() => {
    setLiveEndTime(endTime);
    setLiveServerTimeUnix(serverTimeUnix);
  }, [endTime, serverTimeUnix]);

  useEffect(() => {
    const handleBidUpdate = (event: Event) => {
      const custom = event as BidUpdateEvent;
      if (custom.detail?.auctionId !== auctionID) return;
      if (custom.detail?.endTime) {
        setLiveEndTime(custom.detail.endTime);
      }
      if (typeof custom.detail?.serverTimeUnix === 'number') {
        setLiveServerTimeUnix(custom.detail.serverTimeUnix);
      }
    };

    window.addEventListener('auction:bid-update', handleBidUpdate);
    return () => window.removeEventListener('auction:bid-update', handleBidUpdate);
  }, [auctionID]);

  useEffect(() => {
    if (!liveEndTime) {
      setRemaining(0);
      return;
    }

    const end = Math.floor(new Date(liveEndTime).getTime() / 1000);

    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      setRemaining(Math.max(0, end - now));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [liveEndTime, liveServerTimeUnix]);

  if (!liveEndTime) {
    return <Chip label="Aguardando inicio" variant="outlined" />;
  }

  const isFinished = remaining <= 0;

  return <Chip color={isFinished ? 'default' : 'primary'} variant={isFinished ? 'outlined' : 'filled'} label={isFinished ? 'Encerrado' : formatSeconds(remaining)} />;
}
