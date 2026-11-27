import { httpsOrigin } from '../../backend/src/config/runtime.js';
try {
  const index = process.argv.indexOf('--url');
  if (index === -1 || !process.argv[index + 1]) throw new Error('Usage: npm run smoke:deployment -- --url https://YOUR-SITE.vercel.app');
  const origin = httpsOrigin(process.argv[index + 1], 'Website origin');
  for (const path of ['/', '/api/health', '/api/ready', '/api/attractions']) {
    const response = await fetch(origin + path, { signal: AbortSignal.timeout(90000), redirect: 'error', cache: 'no-store' });
    if (!response.ok) throw new Error(path + ' returned HTTP ' + response.status);
    const type = response.headers.get('content-type') || '';
    if (path === '/') {
      if (!type.includes('text/html') || !(await response.text()).includes('id="root"')) throw new Error('Frontend HTML is not being served.');
    } else {
      if (!type.includes('application/json')) throw new Error(path + ' returned HTML instead of API JSON. Check the Vercel rewrite.');
      const data = await response.json();
      if (path === '/api/attractions' && !Array.isArray(data)) throw new Error('Attractions API did not return a list.');
      if (path !== '/api/attractions' && data.status !== 'ok') throw new Error(path + ' is not ready.');
    }
    console.log('PASS ' + path);
  }
  console.log('Read-only deployment smoke checks passed. Verify login, Google/email, uploads and ownership separately.');
} catch (error) { console.error('Deployment smoke check failed: ' + error.message); process.exitCode = 1; }
