import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { CapacitorHttp, HttpResponseType } from '@capacitor/core';

const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const isCapacitor = (): boolean =>
  typeof window !== 'undefined' &&
  'Capacitor' in window &&
  (window as any).Capacitor.isNativePlatform();

export async function autoFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();

  // 1. TAURI (Desktop)
  if (isTauri()) {
    return await tauriFetch(url, options);
  }

  // 2. CAPACITOR (Mobile)
  if (isCapacitor()) {
    const isImage = /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(url);
    const responseType: HttpResponseType = isImage ? 'arraybuffer' : 'text';

    const nativeRes = await CapacitorHttp.request({
      url,
      method,
      headers: (options.headers as Record<string, string>) || {},
      data: options.body
        ? typeof options.body === 'string'
          ? JSON.parse(options.body)
          : options.body
        : undefined,
      responseType,
    });

    let bodyContent: Blob | string;
    const contentType =
      nativeRes.headers['content-type'] ||
      nativeRes.headers['Content-Type'] ||
      'image/jpeg';

    if (isImage && nativeRes.data) {
      if (typeof nativeRes.data === 'string') {
        const byteCharacters = atob(nativeRes.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        bodyContent = new Blob([byteArray], { type: contentType });
      } else {
        bodyContent = new Blob([nativeRes.data], { type: contentType });
      }
    } else {
      bodyContent =
        typeof nativeRes.data === 'object'
          ? JSON.stringify(nativeRes.data)
          : String(nativeRes.data);
    }

    return new Response(bodyContent, {
      status: nativeRes.status,
      headers: nativeRes.headers,
    });
  }

  // 3. WEB (Browser via Proxy Companion)
  const companionPort = 3000;
  const proxyUrl = `http://localhost:${companionPort}/api/proxy?url=${encodeURIComponent(url)}`;
  return await fetch(proxyUrl, options);
}