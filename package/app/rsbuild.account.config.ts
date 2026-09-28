import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

// Consent Mode default MUST be set synchronously, before any other tag or script can
// touch consent — Google's docs explicitly warn against setting it asynchronously. It
// can't live inside the React GoogleAnalytics component: that component only mounts
// after React hydrates, which is too late for GA4 to treat the default as authoritative.
const gaTagIdAccount = process.env.PUBLIC_GA_TAG_ID_ACCOUNT ?? ''
const consentDefaultScript = gaTagIdAccount
  ? `window.dataLayer = window.dataLayer || [];
window.gtag = function () { window.dataLayer.push(arguments); };
window.gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500,
});`
  : ''

export default defineConfig({
  source: {
    // veysur-app-cloud ships raw TS/TSX source (no build step, see
    // package/app-cloud) — Rsbuild excludes node_modules from its SWC
    // transform by default, so the workspace-linked package needs an
    // explicit include to be compiled rather than served as-is.
    include: [/node_modules[\\/]veysur-app-cloud[\\/]/],
    entry: {
      account: './src/appAccount/index.tsx',
    },
    define: {
      'process.env.npm_package_version': JSON.stringify(
        process.env.npm_package_version || '1.0.0',
      ),
      'process.env.PUBLIC_EDITION': JSON.stringify(
        process.env.PUBLIC_EDITION || 'cloud',
      ),
      'process.env.PUBLIC_BASE_ACCOUNT': JSON.stringify(
        process.env.PUBLIC_BASE_ACCOUNT || '',
      ),
      'process.env.PUBLIC_REST_API_BASE_PATH': JSON.stringify(
        process.env.PUBLIC_REST_API_BASE_PATH || '/api',
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
      'process.env.APP_STRIPE_PUBLISH_KEY': JSON.stringify(
        process.env.APP_STRIPE_PUBLISH_KEY || '',
      ),
      'process.env.PUBLIC_GA_TAG_ID_ACCOUNT': JSON.stringify(
        process.env.PUBLIC_GA_TAG_ID_ACCOUNT ?? '',
      ),
    },
  },
  output: {
    cleanDistPath: false,
    distPath: {
      root: 'dist',
    },
    filename: {
      js: 'account/static/js/[name].[contenthash:8].js',
      css: 'account/static/css/[name].[contenthash:8].css',
    },
  },
  html: {
    template: './public/index.html',
    filename: 'account/index.html',
    templateParameters: {
      title: 'VeySur Account',
    },
    tags: consentDefaultScript
      ? [
          {
            tag: 'script',
            children: consentDefaultScript,
            head: true,
            append: false,
          },
        ]
      : [],
  },
  server: {
    historyApiFallback: true,
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
