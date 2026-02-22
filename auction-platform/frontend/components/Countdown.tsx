'use client';

import { useEffect, useState } from 'react';

function formatSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function Countdown({ endTime, serverTimeUnix }: { endTime?: string; serverTimeUnix: number }) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!endTime) return;

    const end = Math.floor(new Date(endTime).getTime() / 1000);
    const clientNow = Math.floor(Date.now() / 1000);
    const delta = clientNow - serverTimeUnix;

    const tick = () => {
      const adjustedNow = Math.floor(Date.now() / 1000) - delta;
      setRemaining(Math.max(0, end - adjustedNow));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime, serverTimeUnix]);

  return <span className="font-mono text-lg font-semibold">{formatSeconds(remaining)}</span>;
}
