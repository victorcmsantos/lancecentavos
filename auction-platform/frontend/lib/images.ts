export const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
export const MAX_IMAGE_COUNT = 8;

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

export async function filesToDataURLs(files: FileList | File[]): Promise<{ images: string[]; errors: string[] }> {
  const list = Array.from(files).slice(0, MAX_IMAGE_COUNT);
  const images: string[] = [];
  const errors: string[] = [];

  for (const file of list) {
    if (!file.type.startsWith('image/')) {
      errors.push(`${file.name}: arquivo nao e imagem.`);
      continue;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      errors.push(`${file.name}: tamanho maximo 3MB.`);
      continue;
    }
    try {
      const dataURL = await readFileAsDataURL(file);
      images.push(dataURL);
    } catch {
      errors.push(`${file.name}: nao foi possivel carregar.`);
    }
  }

  return { images, errors };
}

export function defaultProductImageDataURL(title?: string): string {
  const safeTitle = (title && title.trim()) || 'Produto';
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="700" fill="url(#g)"/>
  <circle cx="170" cy="130" r="34" fill="#14b8a6" opacity="0.9"/>
  <rect x="115" y="200" width="970" height="360" rx="24" fill="#ffffff" opacity="0.14"/>
  <text x="600" y="340" text-anchor="middle" fill="#e2e8f0" font-size="56" font-family="Arial, sans-serif">Sem imagem do produto</text>
  <text x="600" y="420" text-anchor="middle" fill="#cbd5e1" font-size="42" font-family="Arial, sans-serif">${safeTitle}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
