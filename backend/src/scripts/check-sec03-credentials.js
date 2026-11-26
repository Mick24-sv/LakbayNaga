// SEC-03 check: credential handling and least-privilege database access.
// It never prints a secret value, and it never writes to the database.
import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { errorHandler } from '../middleware/errorHandler.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const backendEnv = fileURLToPath(new URL('../../.env', import.meta.url));
dotenv.config({ path: backendEnv });

// Roles the application's database user may hold, always on its own database.
const allowedRoles = ['readWrite', 'read'];
const minimumPasswordLength = 16;
const defaultDatabases = ['test', 'admin', 'local'];

let failures = 0;
function report(name, ok, hint) {
  if (ok) {
    console.log(name + ': passed');
  } else {
    failures += 1;
    console.log(name + ': FAILED' + (hint ? ' - ' + hint : ''));
  }
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function gitSucceeds(...args) {
  try { git(...args); return true; } catch { return false; }
}

// Lists files that match a pattern in tracked files. Contents are never shown.
function trackedFilesMatching(pattern) {
  try {
    return git('grep', '-I', '-l', '-E', '-e', pattern, '--', '.', ':!package-lock.json')
      .split('\n').filter(Boolean);
  } catch (error) {
    if (error.status === 1) return [];
    throw error;
  }
}

const isEnvFile = path => /(^|\/)\.env(\..+)?$/.test(path) && !/\.env\.example$/.test(path);

function parseEnv(path) {
  const values = {};
  if (!existsSync(path)) return values;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_]\w*)\s*=(.*)$/.exec(line);
    if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

function errorHandlerKeepsSecretsOut() {
  const secret = 'sec03-' + randomBytes(6).toString('hex');
  const logged = [];
  const realError = console.error;
  console.error = (...parts) => logged.push(parts.join(' '));

  let sent;
  const res = {
    status(code) { this.code = code; return this; },
    json(body) { sent = { code: this.code, body }; return this; }
  };

  try {
    errorHandler(new Error('connect failed for mongodb+srv://user:' + secret + '@host.example.test'), {}, res, () => {});
  } finally {
    console.error = realError;
  }
  return sent?.code === 500 &&
    !JSON.stringify(sent.body).includes(secret) &&
    !logged.join(' ').includes(secret);
}

// ---- 1. Repository and source-code checks (no database needed) ----
const inGit = gitSucceeds('rev-parse', '--is-inside-work-tree');

if (inGit) {
  const envPaths = ['backend/.env', 'frontend/.env', 'frontend/.env.local'];
  report('Environment files are ignored by Git (' + envPaths.join(', ') + ')',
    envPaths.every(path => gitSucceeds('check-ignore', '-q', path)),
    'add .env and .env.* (except .env.example) to .gitignore');

  const tracked = git('ls-files').split('\n').filter(isEnvFile);
  const everCommitted = git('log', '--all', '--name-only', '--format=').split('\n').filter(isEnvFile);
  report('No environment file is tracked or was ever committed (any branch)',
    tracked.length === 0 && everCommitted.length === 0,
    'found: ' + [...new Set([...tracked, ...everCommitted])].join(', ') + '. Rotate every value in it.');

  const patterns = [
    'mongodb(\\+srv)?://[^/[:space:]"\'<]+:[^@[:space:]"\'<]+@',
    '(^|[^A-Za-z0-9_])re_[A-Za-z0-9]{24,}',
    'GOCSPX-[A-Za-z0-9_-]{10,}',
    '-----BEGIN ' + '[A-Z ]*PRIVATE KEY-----'
  ];
  const leaks = [...new Set(patterns.flatMap(trackedFilesMatching))];
  report('No database URI with a password, API key or private key in tracked files',
    leaks.length === 0, 'check: ' + leaks.join(', '));
} else {
  console.log('Git checks: skipped (not inside a Git checkout)');
}

const secretNames = /(URI|KEY|SECRET|PASSWORD|TOKEN)/i;
const exampleLeaks = ['backend/.env.example', 'frontend/.env.example'].flatMap(file =>
  Object.entries(parseEnv(root + file))
    .filter(([name, value]) => secretNames.test(name) && value !== '')
    .map(([name]) => file + ' ' + name));
report('Example environment files contain no secret values',
  exampleLeaks.length === 0, 'fill-ins found for: ' + exampleLeaks.join(', '));

const publicLeaks = ['frontend/.env', 'frontend/.env.local', 'frontend/.env.example'].flatMap(file =>
  Object.keys(parseEnv(root + file))
    .filter(name => name.startsWith('VITE_') && /(SECRET|PASSWORD|PRIVATE|TOKEN|API_?KEY|MONGO|DATABASE)/i.test(name))
    .map(name => file + ' ' + name));
report('Frontend VITE_ variables have no secret-looking names (they are public in the browser bundle)',
  publicLeaks.length === 0, 'move to the backend: ' + publicLeaks.join(', '));

report('Error handler keeps connection strings out of responses and logs',
  errorHandlerKeepsSecretsOut(), 'errorHandler.js exposes error text');

// ---- 2. Checks on this computer's backend/.env ----
if (!process.env.MONGODB_URI) {
  console.log('Local .env and database checks: skipped (MONGODB_URI is not set in backend/.env)');
} else {
  let url;
  try { url = new URL(process.env.MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:')); } catch { url = null; }

  const isSrv = process.env.MONGODB_URI.startsWith('mongodb+srv://');
  report('MONGODB_URI uses mongodb+srv:// (TLS is on by default)', Boolean(url) && isSrv, 'use the Atlas SRV connection string');

  const databaseName = url ? decodeURIComponent(url.pathname.replace(/^\//, '')) : '';
  report('MONGODB_URI names its own database, not a default one',
    databaseName !== '' && !defaultDatabases.includes(databaseName),
    'add the database name after the host, for example .../lakbaynaga?...');

  const password = url ? decodeURIComponent(url.password) : '';
  report('Database password has at least ' + minimumPasswordLength + ' characters',
    password.length >= minimumPasswordLength, 'create a new Atlas user with an autogenerated password');

  const username = url ? decodeURIComponent(url.username) : '';
  report('Database user is not a default administrator name',
    !/^(admin|root|atlasadmin)$/i.test(username), 'create a dedicated application user');

  report('ADMIN_PASSWORD is not left in backend/.env',
    !process.env.ADMIN_PASSWORD, 'delete the ADMIN_* lines after running create-admin');

  // ---- 3. Live database access (read-only) ----
  try {
    const { connectDatabase, disconnectDatabase } = await import('../config/database.js');
    const connection = await connectDatabase();
    try {
      const status = await connection.db.command({ connectionStatus: 1, showPrivileges: false });
      const roles = status.authInfo?.authenticatedUserRoles ?? [];
      const names = roles.map(role => role.role + '@' + role.db);
      report('Database user holds only ' + allowedRoles.join('/') + ' on its own database (' + (names.join(', ') || 'no roles') + ')',
        roles.length > 0 && roles.every(role => allowedRoles.includes(role.role) && role.db === connection.name),
        'create a user with readWrite on ' + connection.name + ' only (not Atlas admin or any-database roles)');

      let otherDatabases;
      try {
        const listed = await connection.db.admin().command({ listDatabases: 1, nameOnly: true, authorizedDatabases: true });
        otherDatabases = listed.databases.map(database => database.name).filter(name => name !== connection.name);
      } catch (error) {
        if (error.code !== 13) throw error;
        otherDatabases = [];
      }
      report('Database user cannot see other databases', otherDatabases.length === 0,
        'it can see ' + otherDatabases.length + ' other database(s)');

      report('Connection uses TLS', connection.getClient().options?.tls === true,
        'use the mongodb+srv:// Atlas connection string');
    } finally {
      await disconnectDatabase();
    }
  } catch (error) {
    report('Live database checks', false, 'could not run. Error type: ' + error.name);
  }
}

console.log(failures === 0 ? 'LNK-SEC-03 verification: passed' : 'LNK-SEC-03 verification: ' + failures + ' check(s) FAILED');
process.exitCode = failures === 0 ? 0 : 1;