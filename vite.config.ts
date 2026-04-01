import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import packageJson from './package.json';
import { VitePWA } from 'vite-plugin-pwa';


export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      registerType: 'prompt',
      srcDir: ".",
      filename: "imageCacheWorker.js",
      strategies: "injectManifest",
      injectRegister: false,
      manifest: false,
      injectManifest: {
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: true,
        type: 'module',
        /* other options */
      }
    }),
    {
      name: 'html-cache-bust',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head><meta name="deploy-id" content="${Date.now()}">`
        );
      }
    }
  ],
  server: {
    port: 3000,
    headers: {
      'Service-Worker-Allowed': '/',
    }
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    manifest: 'manifest.json',
    assetsInlineLimit: (filePath, content) => {
      // Don't inline files with 'logo' in the name
      if (filePath.includes('logo')) {
        return false;
      }
      // Default behavior for other files (4kb threshold)
      return content.length < 4096;
    }
  },
  envPrefix: 'PRIMAL_',
  define: {
    'import.meta.env.PRIMAL_VERSION': JSON.stringify(packageJson.version),
  },
  esbuild: {
    keepNames: true,
  },
  resolve: {
    alias: {
      src: "/src",
      components: "/src/components",
      assets: "/src/assets",
    },
  },
});
