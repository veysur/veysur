/// <reference types="astro/client" />

// @astrojs/starlight declares this module in `virtual-internal.d.ts`, but never
// references that file from anywhere reachable, so `astro check` cannot resolve it.
declare module 'virtual:starlight/user-images' {
  type ImageMetadata = import('astro').ImageMetadata
  export const logos: {
    dark?: ImageMetadata
    light?: ImageMetadata
  }
}
