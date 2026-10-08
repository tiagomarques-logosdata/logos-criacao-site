// The Google Ads base tag is active; add the label to enable WhatsApp conversions.
const id = process.env.GOOGLE_ADS_ID || 'AW-18430684930';
const label = process.env.GOOGLE_ADS_CONVERSION_LABEL || '';
if (id && !/^AW-\d+$/.test(id)) throw new Error('GOOGLE_ADS_ID must use AW- followed by digits.');
if (label && !/^[A-Za-z0-9_-]+$/.test(label)) throw new Error('Invalid GOOGLE_ADS_CONVERSION_LABEL.');
export const adsHead = id
  ? `<meta name="google-ads-id" content="${id}">${label ? `<meta name="google-ads-conversion" content="${id}/${label}">` : ''}<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`
  : '';
