import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
    const isDevServer = command === 'serve';

    return {
        build: {
            outDir: "./build/web",
            emptyOutDir: true,
        },
        base: "./",
        publicDir: "./public",
        server: {
            watch: {
                ignored: ["**/public/sources/**"],
            },
            proxy: isDevServer ? {
                '/api/proxy': {
                    target: 'https://kaliscan.com',
                    changeOrigin: true,
                    bypass: async (req, res) => {
                        if (!res) return;

                        const urlParams = new URL(req.url!, `http://${req.headers.host}`).searchParams;
                        const targetUrl = urlParams.get('url');

                        if (!targetUrl) {
                            res.statusCode = 400;
                            res.end(JSON.stringify({ error: 'Manca il parametro ?url=' }));
                            return true;
                        }

                        try {
                            const response = await fetch(targetUrl, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                }
                            });

                            const contentType = response.headers.get('content-type');
                            if (contentType) res.setHeader('Content-Type', contentType);

                            res.setHeader('Access-Control-Allow-Origin', '*');
                            res.statusCode = response.status;

                            const buffer = await response.arrayBuffer();
                            res.end(Buffer.from(buffer));
                        } catch (error) {
                            res.statusCode = 500;
                            res.end((error as Error).message);
                        }
                        return true;
                    }
                }
            } : undefined
        }
    };
});