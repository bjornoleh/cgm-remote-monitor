import { defineConfig } from "vite";
import { sveltekit } from '@sveltejs/kit/vite';
import commonjs from "vite-plugin-commonjs";
import inject from "@rollup/plugin-inject";
import tailwindcss from '@tailwindcss/vite';
import { resolve } from "path";
import { paraglide } from "@inlang/paraglide-sveltekit/vite";

const isDevelopment = process.env.NODE_ENV === "development";

export default defineConfig({
  root: "./bundle",
  appType: "mpa",
  publicDir: "public",
  build: {
    sourcemap: true,
    minify: !isDevelopment,
    outDir: `../dist`,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        profile: resolve(__dirname, "bundle/profile/index.html"),
        food: resolve(__dirname, "bundle/food/index.html"),
        admin: resolve(__dirname, "bundle/admin/index.html"),
        report: resolve(__dirname, "bundle/report/index.html"),
        clock: resolve(__dirname, "bundle/clock/index.html"),
        main: resolve(__dirname, "bundle/index.html"),
      },
      external: ["flot", "flot/jquery.flot.time", "flot/jquery.flot.pie", "flot/jquery.flot.fillbetween"],
    },
    target: "es2015",
    commonjsOptions: {
      transformMixedEsModules: true,
      defaultIsModuleExports: true,
    },
  },
  define: {
    global: "window",
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV ?? "production",
    ),
  },
  assetsInclude: ["**/*.jpg", "**/*.png", "**/*.gif"],
  plugins: [
    tailwindcss(),
    sveltekit(),
    paraglide({
        project: "./project.inlang",
        outdir: "./src/lib/paraglide"
    }),
    commonjs(),
    inject({
      $: "jquery",
      jQuery: "jquery",
    }),
  ],
  resolve: {
    alias: {
      stream: "stream-browserify",
    },
  },
  optimizeDeps: {
    include: ["jquery-ui", "lodash", "d3"],
  },
  server: {
    hmr: true,
    port: 5173,
    proxy: {
      // Backend API routes - proxy to Nightscout server on port 1337 (matching Caddyfile)
      '^/api/.*': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        secure: false,
      },

      // Socket.io for real-time communication
      '^/socket.io/.*': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
        secure: false,
      },

      // Service worker
      '/sw.js': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        secure: false,
      },

      // Translations
      '^/translations/.*': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        secure: false,
      },

      // Development bundle routes
      '^/devbundle/.*': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        secure: false,
      },

      // Bundle routes
      '^/bundle/.*': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        secure: false,
      },

      // Webpack HMR (if used)
      '^/__webpack_hmr/.*': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        ws: true,
        secure: false,
      },

      // Handle clock face redirects - proxy clock routes that need backend data
      '^/clock/(?!.*\\.(html|js|css|png|jpg|gif|svg)$).*': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Handle clock face redirects similar to Caddy
            if (req.url) {
              const clockMatch = req.url.match(/^\/clock\/([^?]+)$/);
              if (clockMatch && !req.url.includes('?')) {
                const face = clockMatch[1];
                // Redirect to clock root with face parameter
                res.writeHead(302, {
                  'Location': `/clock/?face=${face}`
                });
                res.end();
                return;
              }
            }
          });
        }
      },

      // Profile, admin, report redirects - ensure trailing slash
      '/profile$': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.url === '/profile') {
              res.writeHead(302, { 'Location': '/profile/' });
              res.end();
              return;
            }
          });
        }
      },

      '/admin$': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.url === '/admin') {
              res.writeHead(302, { 'Location': '/admin/' });
              res.end();
              return;
            }
          });
        }
      },

      '/report$': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.url === '/report') {
              res.writeHead(302, { 'Location': '/report/' });
              res.end();
              return;
            }
          });
        }
      },
    }
  },
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}']
    }
});
