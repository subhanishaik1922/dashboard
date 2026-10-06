/**
 * Vercel Serverless Function Entrypoint
 * Bridges incoming Vercel requests to the Express application.
 */
const app = require('../server.js');

const handler = (req, res) => {
  // Enforce zero-caching on Vercel Serverless/Edge responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  return app(req, res);
};

// Explicit dynamic execution & zero-revalidation flags to bypass Vercel build-time caching
handler.dynamic = 'force-dynamic';
handler.revalidate = 0;
handler.fetchCache = 'force-no-store';

module.exports = handler;
module.exports.dynamic = 'force-dynamic';
module.exports.revalidate = 0;
module.exports.fetchCache = 'force-no-store';
