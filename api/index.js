/**
 * Vercel Serverless Function Entrypoint
 * Bridges incoming Vercel requests to the Express application.
 */
const app = require('../server.js');

module.exports = (req, res) => {
  return app(req, res);
};
