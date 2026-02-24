'use client';

import { useMemo, useState } from 'react';
import { defaultProductImageDataURL } from '@/lib/images';

export function ImageCarousel({ images, title }: { images: string[]; title: string }) {
  const validImages = useMemo(() => {
    const filtered = images.filter((item) => typeof item === 'string' && item.trim() !== '');
    if (filtered.length) return filtered;
    return [defaultProductImageDataURL(title)];
  }, [images, title]);
  const [current, setCurrent] = useState(0);

  const currentImage = validImages[current] ?? validImages[0];

  return (
    <div className="mt-4 rounded-lg border p-3">
      <div className="relative h-64 overflow-hidden rounded-md bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentImage} alt={title} className="h-full w-full object-contain" />
      </div>

      {validImages.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1">
            {validImages.map((_, index) => (
              <button
                key={`${index}`}
                type="button"
                onClick={() => setCurrent(index)}
                className={`h-2 w-2 rounded-full ${index === current ? 'bg-brand' : 'bg-slate-400'}`}
                aria-label={`Ir para imagem ${index + 1}`}
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}
