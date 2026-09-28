import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

export default defineConfig({
  source: {
    entry: {
      admin: './src/appAdmin/index.tsx',
    },
    define: {
      'process.env.PUBLIC_EDITION': JSON.stringify(
        process.env.PUBLIC_EDITION || 'cloud',
      ),
      'process.env.PUBLIC_BASE_ADMIN': JSON.stringify(
        process.env.PUBLIC_BASE_ADMIN || '/admin',
      ),
      'process.env.PUBLIC_PROJECT_SCOPE': JSON.stringify(
        process.env.PUBLIC_PROJECT_SCOPE || 'subdomain',
      ),
      'process.env.PUBLIC_AUTHENTICATION_DOMAIN': JSON.stringify(
        process.env.PUBLIC_AUTHENTICATION_DOMAIN || '',
      ),
      'process.env.PUBLIC_AUTHENTICATION_HOME_PATH': JSON.stringify(
        process.env.PUBLIC_AUTHENTICATION_HOME_PATH || '/admin',
      ),
      // Falls back to PUBLIC_BASE_ACCOUNT before a bare '/' — on a single
      // origin (no PUBLIC_AUTHENTICATION_DOMAIN) a bare '/' would send
      // "Manage Account" links to whichever app is mounted at the origin's
      // root instead of the account app. See AuthDomainConfig.getAuthDomainHomePath.
      'process.env.PUBLIC_AUTHENTICATION_DOMAIN_HOME_PATH': JSON.stringify(
        process.env.PUBLIC_AUTHENTICATION_DOMAIN_HOME_PATH ||
          process.env.PUBLIC_BASE_ACCOUNT ||
          '/',
      ),
      'process.env.PUBLIC_AUTHENTICATION_LOGIN_PATH': JSON.stringify(
        process.env.PUBLIC_AUTHENTICATION_LOGIN_PATH || '/login',
      ),
      'process.env.PUBLIC_AUTHENTICATION_LOGOUT_PATH': JSON.stringify(
        process.env.PUBLIC_AUTHENTICATION_LOGOUT_PATH || '/logout',
      ),
      'process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS': JSON.stringify(
        process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS || '',
      ),
      'process.env.PUBLIC_APP_DOMAIN': JSON.stringify(
        process.env.PUBLIC_APP_DOMAIN || 'veysur.local',
      ),
      'process.env.PUBLIC_DOCS_DOMAIN': JSON.stringify(
        process.env.PUBLIC_DOCS_DOMAIN || '',
      ),
    },
  },
  output: {
    cleanDistPath: false,
    distPath: {
      root: 'dist',
    },
    filename: {
      js: 'admin/static/js/[name].[contenthash:8].js',
      css: 'admin/static/css/[name].[contenthash:8].css',
    },
  },
  html: {
    template: './public/index.html',
    filename: 'admin/index.html',
    templateParameters: {
      title: 'VeySur Admin',
    },
  },
  server: {
    historyApiFallback: {
      rewrites: [{ from: /^\/admin/, to: '/admin/index.html' }],
    },
  },
  dev: {
    writeToDisk: true,
    lazyCompilation: false,
    client: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
  },
  tools: {
    // Unlike Vite/Astro (used by website/blogsite/docsite), which treats a
    // leading-'/' CSS url() as a runtime public-root reference and leaves it
    // alone, css-loader's default `url: true` tries to resolve every url() —
    // including absolute ones — as a build-time module import, which fails
    // for veysur-theme/base.css's `url('/fonts/Geist-Variable.woff2')` (a
    // public/ asset, not a module). Skip resolution for absolute paths so
    // they pass through as literal public-root references, same as Vite.
    cssLoader: {
      url: {
        filter: (url: string) => !url.startsWith('/'),
      },
    },
  },
  plugins: [pluginReact()],
})
