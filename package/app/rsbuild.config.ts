import { randomBytes, createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import tailwindcssPostcss from '@tailwindcss/postcss'

// This combined all-in-one dev/build config is only ever used as a local
// convenience (one dev server bundles every sub-app together).
// The commercial app-cloud package never ships in the self-hosted/public
// edition, so the platform entry is added conditionally on its presence —
// never a hardcoded reference to a sibling package that may not exist in
// that build. A commercial checkout places that package four levels up from
// this file, outside this repo entirely, hence the four `../`.
const appCloudPlatformEntry = resolve(
  __dirname,
  '../../../../package/app-cloud/src/appPlatform/index.tsx',
)
const hasAppCloud = existsSync(appCloudPlatformEntry)

const siteAccessKey = process.env.PUBLIC_SITE_ACCESS_KEY ?? ''
const siteAccessSalt = siteAccessKey ? randomBytes(16).toString('hex') : ''
const siteAccessHash = siteAccessKey
  ? createHash('sha256')
      .update(siteAccessSalt + siteAccessKey)
      .digest('hex')
  : ''

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
    // The commercial veysur-app-cloud package ships raw TS/TSX source (no build step) — Rsbuild
    // excludes node_modules from its SWC transform by default, so the
    // workspace-linked package (reached from the account entry's gated
    // billing/support require()) needs an explicit include.
    include: [/node_modules[\\/]veysur-app-cloud[\\/]/],
    entry: {
      admin: './src/appAdmin/index.tsx',
      survey: './src/appSurvey/index.tsx',
      account: './src/appAccount/index.tsx',
      ...(hasAppCloud ? { platform: appCloudPlatformEntry } : {}),
    },
    define: {
      'process.env.npm_package_version': JSON.stringify(
        process.env.npm_package_version || '1.0.0',
      ),
      'process.env.BUILD_VERSION': JSON.stringify(
        process.env.BUILD_VERSION || 'dev',
      ),
      'process.env.PUBLIC_EDITION': JSON.stringify(
        process.env.PUBLIC_EDITION || 'cloud',
      ),
      'process.env.PUBLIC_BASE_ADMIN': JSON.stringify(
        process.env.PUBLIC_BASE_ADMIN || '/admin',
      ),
      'process.env.PUBLIC_BASE_ACCOUNT': JSON.stringify(
        process.env.PUBLIC_BASE_ACCOUNT || '',
      ),
      // Default matches the route paths' historical shape (routes no longer
      // hardcode '/survey' themselves — see appSurvey/Router.tsx) so cloud's
      // served URLs are unchanged; a self-hosted deployment may override.
      'process.env.PUBLIC_BASE_SURVEY': JSON.stringify(
        process.env.PUBLIC_BASE_SURVEY || '/survey',
      ),
      'process.env.PUBLIC_PROJECT_SCOPE': JSON.stringify(
        process.env.PUBLIC_PROJECT_SCOPE || 'subdomain',
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
      'process.env.PUBLIC_SITE_ACCESS_SALT': JSON.stringify(siteAccessSalt),
      'process.env.PUBLIC_SITE_ACCESS_HASH': JSON.stringify(siteAccessHash),
      'process.env.PUBLIC_SITE_UNAVAILABLE_TITLE': JSON.stringify(
        process.env.PUBLIC_SITE_UNAVAILABLE_TITLE ?? '',
      ),
      'process.env.PUBLIC_SITE_UNAVAILABLE_MESSAGE': JSON.stringify(
        process.env.PUBLIC_SITE_UNAVAILABLE_MESSAGE ?? '',
      ),
      'process.env.PUBLIC_BUGSINK_DSN_ADMIN': JSON.stringify(
        process.env.PUBLIC_BUGSINK_DSN_ADMIN ?? '',
      ),
      'process.env.PUBLIC_BUGSINK_DSN_SURVEY': JSON.stringify(
        process.env.PUBLIC_BUGSINK_DSN_SURVEY ?? '',
      ),
      'process.env.PUBLIC_BUGSINK_DSN_ACCOUNT': JSON.stringify(
        process.env.PUBLIC_BUGSINK_DSN_ACCOUNT ?? '',
      ),
      'process.env.PUBLIC_BUGSINK_DSN_PLATFORM': JSON.stringify(
        process.env.PUBLIC_BUGSINK_DSN_PLATFORM ?? '',
      ),
      'process.env.PUBLIC_GA_TAG_ID_ACCOUNT': JSON.stringify(
        process.env.PUBLIC_GA_TAG_ID_ACCOUNT ?? '',
      ),
    },
  },
  output: {
    distPath: {
      root: 'dist',
    },
    filename: {
      js: '[name]/static/js/[name].[contenthash:8].js',
      css: '[name]/static/css/[name].[contenthash:8].css',
    },
    sourceMap: {
      js:
        process.env.GENERATE_SOURCEMAP === 'true' ? 'hidden-source-map' : false,
      css: false,
    },
  },
  html: {
    template: './public/index.html',
  },
  tools: {
    rspack: (config) => {
      // The filename.js pattern embeds the full path (e.g. 'admin/static/js/admin.js')
      // which works for named entry chunks but breaks async chunks: RSBuild also prefixes
      // async chunks with distPath.jsAsync ('static/js/async'), producing a doubled path
      // like 'static/js/async/[chunk]/static/js/[chunk].js'. Override chunkFilename to a
      // flat pattern so async chunks land at 'static/js/async/[name].[hash].js'.
      config.output ??= {}
      config.output.chunkFilename = 'static/js/async/[name].[contenthash:8].js'
      return config
    },
    postcss: (config, { addPlugins }) => {
      // Import the Tailwind CSS v4 PostCSS plugin
      addPlugins(tailwindcssPostcss)
    },
    htmlPlugin: (config, { entryName }) => {
      if (entryName === 'admin') {
        config.filename = 'admin/index.html'
        config.templateParameters = {
          title: 'VeySur Admin',
        }
      }
      if (entryName === 'survey') {
        config.filename = 'survey/index.html'
        config.templateParameters = {
          title: 'VeySur',
        }
      }
      if (entryName === 'account') {
        config.filename = 'account/index.html'
        config.templateParameters = {
          title: 'VeySur Account',
        }
      }
      if (entryName === 'platform') {
        config.filename = 'platform/index.html'
        config.templateParameters = {
          title: 'Veysur Platform',
        }
      }
      return config
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    historyApiFallback: {
      // Disable for file-like requests (anything with a file extension)
      disableDotRule: false,
      rewrites: [
        // Admin app (accessed via project.veysur.local/admin/*)
        // Exclude static assets from rewrite
        {
          from: /^\/admin\/(?!static\/).*/,
          to: '/admin/index.html',
        },
        // Survey app (accessed via project.veysur.local/survey/*)
        {
          from: /^\/survey\/(?!static\/).*/,
          to: '/survey/index.html',
        },
        // Account app (accessed via project.veysur.local/account/* OR account.veysur.local/*)
        {
          from: /^\/account\/(?!static\/).*/,
          to: '/account/index.html',
        },
        // Platform app (accessed via platform.veysur.local/platform/* or platform.veysur.local/*)
        // — only present when package/app-cloud exists (see hasAppCloud above)
        ...(hasAppCloud
          ? [
              {
                from: /^\/platform\/(?!static\/).*/,
                to: '/platform/index.html',
              },
            ]
          : []),
        // Account app catch-all: any path not matching admin/survey/platform
        // prefixes is served by the account app (account.veysur.local subdomain)
        { from: /.*/, to: '/account/index.html' },
      ],
    },
  },
  dev: {
    lazyCompilation: false,
  },
  plugins: [
    // fastRefresh injects $RefreshReg$/$RefreshSig$ calls whenever mode === 'development',
    // regardless of whether a dev server is actually serving the bundle. Those globals are
    // only supplied by the dev server's HMR runtime — a static `rsbuild build --mode
    // development` (used to get react-dom's descriptive dev warnings in a debug image,
    // see Dockerfile.nginx's BUILD_MODE arg) has no such runtime, so the app crashes on
    // load with "$RefreshSig$ is not defined". BUILD_MODE is set only by that Docker build
    // path, never by the local `pnpm dev` / `pnpm devAdmin` etc. scripts, so this leaves
    // real HMR untouched.
    pluginReact({ fastRefresh: process.env.BUILD_MODE !== 'development' }),
    // Inject the GA4 consent-default script as the very first <head> tag, but only into
    // the account entry's HTML — tools.htmlPlugin's per-entry config doesn't support a
    // 'tags' option (that's handled by a separate Rsbuild pipeline), so this needs the
    // modifyHTMLTags plugin hook instead, scoped by output filename.
    {
      name: 'inject-ga-consent-default',
      setup(api) {
        api.modifyHTMLTags((tags, { filename }) => {
          if (filename === 'account/index.html' && consentDefaultScript) {
            tags.headTags.unshift({
              tag: 'script',
              children: consentDefaultScript,
            })
          }
          return tags
        })
      },
    },
  ],
})
