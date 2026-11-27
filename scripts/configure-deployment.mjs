import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { httpsOrigin } from '../backend/src/config/runtime.js';
try {
  const index = process.argv.indexOf('--api');
  if (index === -1 || !process.argv[index + 1]) throw new Error('Usage: npm run configure:deployment -- --api https://YOUR-API.onrender.com');
  const origin = httpsOrigin(process.argv[index + 1], 'Render API origin');
  const file = fileURLToPath(new URL('../vercel.json', import.meta.url));
  const config = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  config.rewrites = config.rewrites.map(rule => rule.source === '/api/:path*' ? { ...rule, destination: origin + '/api/:path*' } : rule);
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
  console.log('Updated vercel.json with the Render API origin. No deployment performed.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
