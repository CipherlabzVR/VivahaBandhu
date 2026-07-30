/** Shared LCP couple image URLs — keep layout preload + Hero `<picture>` in sync. */

const CLOUDINARY_BASE =
  'https://res.cloudinary.com/df52tya8p/image/upload';
const CLOUDINARY_ID = 'v1777957492/Picsart_26-05-05_10-30-47-506_gxogmo.webp';

/** Mobile / narrow viewports — smaller bytes for Slow 4G LCP. */
export const HERO_LCP_IMG_MOBILE = `${CLOUDINARY_BASE}/f_auto,q_auto:eco,w_640,c_limit/${CLOUDINARY_ID}`;

/** Desktop — sharper for large couple column. */
export const HERO_LCP_IMG_DESKTOP = `${CLOUDINARY_BASE}/f_auto,q_auto:good,w_960,c_limit/${CLOUDINARY_ID}`;
