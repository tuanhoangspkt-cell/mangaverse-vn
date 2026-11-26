const path = require('path');
// Ensure Vercel NFT bundler traces and includes the synced manga database
try {
  require(path.join(__dirname, '..', 'db', 'synced-manga.json'));
} catch (_) {}

const netlifyFn = require('../netlify/functions/api');

function readRequestBody(req) {
  return new Promise((resolve) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return resolve('');
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}

module.exports = async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const queryStringParameters = {};
  for (const [k, v] of urlObj.searchParams.entries()) {
    queryStringParameters[k] = v;
  }

  const body = await readRequestBody(req);
  const result = await netlifyFn.handler({
    httpMethod: req.method || 'GET',
    path: urlObj.pathname,
    queryStringParameters,
    headers: req.headers,
    body,
  });

  res.statusCode = result.statusCode || 200;
  for (const [k, v] of Object.entries(result.headers || {})) {
    res.setHeader(k, v);
  }

  if (result.isBase64Encoded) {
    res.end(Buffer.from(result.body, 'base64'));
  } else {
    res.end(result.body);
  }
};
