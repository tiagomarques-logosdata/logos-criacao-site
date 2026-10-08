// Set both values in the hosting provider's build environment to enable tracking.
const id = process.env.GOOGLE_ADS_ID || '';
const label = process.env.GOOGLE_ADS_CONVERSION_LABEL || '';
if (id && !/^AW-\d+$/.test(id)) throw new Error('GOOGLE_ADS_ID must use AW- followed by digits.');
if (label && !/^[A-Za-z0-9_-]+$/.test(label)) throw new Error('Invalid GOOGLE_ADS_CONVERSION_LABEL.');
export const adsHead = id && label
  ? `<meta name="google-ads-conversion" content="${id}/${label}"><script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`
  : '';
