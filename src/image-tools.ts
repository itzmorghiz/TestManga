import * as StackBlur from 'stackblur-canvas';
import { autoFetch } from './http-client';

const blurCache = new Map<string, string>();

export interface BlurOptions {
  targetWidth?: number;
  blurRadius?: number;
  quality?: number;
}

/**
 * Restituisce una Promise<string> contenente l'immagine elaborata in formato Data URL (base64)
 */
export function blurImage(
  url: string,
  options: BlurOptions = {}
): Promise<string> {
  const { targetWidth = 200, blurRadius = 15, quality = 0.8 } = options;
  const cacheKey = `${url}_r${blurRadius}_w${targetWidth}_q${quality}`;

  // Se è in cache, restituisce immediatamente una Promise risolta con la stringa base64
  if (blurCache.has(cacheKey)) {
    return Promise.resolve(blurCache.get(cacheKey)!);
  }

  return (async () => {
    let objectUrl: string | null = null;

    try {
      const response = await autoFetch(url);

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Il Blob dell\'immagine scaricato è vuoto.');
      }

      objectUrl = URL.createObjectURL(blob);

      // Elaborazione canvas
      const base64Result = await processBlurOnCanvas(
        objectUrl,
        targetWidth,
        blurRadius,
        quality
      );

      // Salviamo il risultato in cache
      blurCache.set(cacheKey, base64Result);

      // Restituisce direttamente la stringa base64
      return base64Result;

    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  })();
}

function processBlurOnCanvas(
  imageSrc: string,
  targetWidth: number,
  blurRadius: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    if (!imageSrc.startsWith('blob:') && !imageSrc.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        reject(new Error('L\'immagine ha dimensioni pari a 0.'));
        return;
      }

      const aspectRatio = img.height / img.width;
      const targetHeight = Math.round(targetWidth * aspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Impossibile ottenere il contesto 2D del Canvas.'));
        return;
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      try {
        StackBlur.canvasRGBA(canvas, 0, 0, targetWidth, targetHeight, blurRadius);
        const base64Result = canvas.toDataURL('image/jpeg', quality);
        resolve(base64Result);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error(`Caricamento dell'immagine fallito per la sorgente fornita.`));
    };

    img.src = imageSrc;
  });
}