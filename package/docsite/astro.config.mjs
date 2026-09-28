import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

// Consent Mode default MUST be set synchronously, before any other tag or script can
// touch consent — Google's docs explicitly warn against setting it asynchronously. It
// can't live inside the React GoogleAnalytics island (src/components/GoogleAnalytics.tsx):
// that component only hydrates after its own JS chunk loads (client:only="react"), which
// is too late for GA4 to treat the default as authoritative.
const gaTagId = process.env.PUBLIC_GA_TAG_ID_DOCS ?? ''
const consentDefaultScript = gaTagId
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
  redirects: {
    '/reference/survey-editor/elements': '/reference/survey-editor/survey-structure',
  },
  integrations: [
    react(),
    starlight({
      head: consentDefaultScript ? [{ tag: 'script', content: consentDefaultScript }] : [],
      title: 'VeySur Admin Guide',
      description: 'A guide for VeySur project administrators.',
      logo: {
        light: './src/assets/veysur-logo-light.svg',
        dark: './src/assets/veysur-logo-dark.svg',
        replacesTitle: true,
      },
      customCss: ['./src/styles/custom.css'],
      components: {
        Footer: './src/overrides/Footer.astro',
        SiteTitle: './src/overrides/SiteTitle.astro',
        ThemeProvider: './src/overrides/ThemeProvider.astro',
      },
      social: [],
      sidebar: [
        { label: 'Introduction', link: '/' },
        { label: 'Video Tutorials', slug: 'video-tutorials' },
        {
          label: 'Getting Started',
          items: [
            { label: 'First Survey', slug: 'getting-started/first-survey' },
          ],
        },
        {
          label: 'Reference',
          items: [
            {
              label: 'Survey Editor',
              items: [
                { label: 'Survey structure', slug: 'reference/survey-editor/survey-structure' },
                { label: 'Content Elements', slug: 'reference/survey-editor/content-elements' },
                { label: 'Formatting Survey Text', slug: 'reference/survey-editor/formatting' },
                {
                  label: 'Question Types',
                  items: [
                    { label: 'Simple', slug: 'reference/survey-editor/question-types/simple' },
                    { label: 'Choice', slug: 'reference/survey-editor/question-types/choice' },
                    { label: 'Date / Time', slug: 'reference/survey-editor/question-types/date-time' },
                    { label: 'Matrix', slug: 'reference/survey-editor/question-types/matrix' },
                    { label: 'Multi-Part', slug: 'reference/survey-editor/question-types/multi-part' },
                    { label: 'Ranking', slug: 'reference/survey-editor/question-types/ranking' },
                    { label: 'File Upload', slug: 'reference/survey-editor/question-types/file-upload' },
                  ],
                },
                { label: 'Preview', slug: 'reference/survey-editor/preview' },
                { label: 'Participants', slug: 'reference/survey-editor/participants' },
                { label: 'Participant Attributes', slug: 'reference/survey-editor/participant-attributes' },
                { label: 'Publications', slug: 'reference/survey-editor/publications' },
                { label: 'Responses', slug: 'reference/survey-editor/responses' },
                { label: 'Settings', slug: 'reference/survey-editor/settings' },
                { label: 'Statistics', slug: 'reference/survey-editor/statistics' },
                { label: 'Conditional Questions', slug: 'reference/survey-editor/conditional-questions' },
                { label: 'Text Expressions', slug: 'reference/survey-editor/text-expressions' },
                { label: 'Variable Paths', slug: 'reference/survey-editor/variable-paths' },
              ],
            },
            { label: 'Import / Export', slug: 'reference/import-export' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Edit Survey Structure', slug: 'guides/edit-survey-structure' },
            { label: 'Invite Participants', slug: 'guides/invite-participants' },
            { label: 'Participant Registration', slug: 'guides/participant-registration' },
            { label: 'Manage Participant Attributes', slug: 'guides/manage-participant-attributes' },
            { label: 'Manage Team Members', slug: 'guides/manage-team-members' },
            { label: 'Publish Your Survey', slug: 'guides/publish-your-survey' },
            { label: 'Merge Publication Responses', slug: 'guides/merge-publication-responses' },
            { label: 'Create a Multi-Language Survey', slug: 'guides/create-multi-language-survey' },
            { label: 'Create a Conditional Question', slug: 'guides/create-conditional-question' },
            { label: 'Use Expressions in Survey Text', slug: 'guides/use-text-expressions' },
          ],
        },
      ],
    }),
  ],
  vite: { plugins: [tailwindcss()] },
})
