import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { httpsOrigin } from '../../backend/src/config/runtime.js';
const configPath = fileURLToPath(new URL('../vercel.json', import.meta.url));
const production = process.argv.includes('--production');
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
  if (config.outputDirectory !== 'dist' || config.buildCommand !== 'npm run build') throw new Error('Vercel must build the frontend directory and publish dist.');
  const rule = config.rewrites?.find(rule => rule.source === '/api/:path*');
  if (!rule?.destination?.endsWith('/api/:path*')) throw new Error('The Vercel API rewrite is missing or malformed.');
  const origin = rule.destination.slice(0, -'/api/:path*'.length);
  if (origin.endsWith('.invalid') && !production) {
    console.log('Deployment template valid. PENDING: run npm run configure:deployment -- --api https://YOUR-API.onrender.com before deploying.');
  } else {
    httpsOrigin(origin, 'Render API origin');
    console.log('Deployment API rewrite: valid HTTPS origin.');
  }
  if (production && !process.env.VITE_GOOGLE_CLIENT_ID) console.warn('Google sign-in will be unavailable until VITE_GOOGLE_CLIENT_ID is configured in Vercel.');
  console.log(production ? 'Vercel production configuration check passed.' : 'Local deployment configuration check passed. No deployment performed.');
} catch (error) { console.error('Deployment check failed: ' + error.message); process.exitCode = 1; }
