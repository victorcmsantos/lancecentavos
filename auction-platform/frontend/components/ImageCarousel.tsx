'use client';

import { Box, IconButton, Paper, Stack } from '@mui/material';
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
    <Paper sx={{ mt: 3, p: 1.5, borderRadius: 6 }}>
      <Box
        sx={{
          position: 'relative',
          height: { xs: 280, md: 340 },
          overflow: 'hidden',
          borderRadius: 5,
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.92)' : 'rgba(248,250,252,0.92)'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentImage} alt={title} className="h-full w-full object-contain p-5" />
      </Box>

      {validImages.length > 1 ? (
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
          {validImages.map((_, index) => (
            <IconButton
              key={`${index}`}
              size="small"
              onClick={() => setCurrent(index)}
              aria-label={`Ir para imagem ${index + 1}`}
              sx={{
                width: index === current ? 32 : 12,
                height: 12,
                borderRadius: 999,
                bgcolor: index === current ? 'primary.main' : 'action.disabledBackground',
                '&:hover': {
                  bgcolor: index === current ? 'primary.dark' : 'action.selected'
                }
              }}
            />
          ))}
        </Stack>
      ) : null}
    </Paper>
  );
}
