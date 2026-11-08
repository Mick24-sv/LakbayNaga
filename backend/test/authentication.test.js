import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { makeStore } from '../src/store.js';
import { verifyPassword } from '../src/auth.js';


async function withServer(check) {
  const store = makeStore();
  await store.ready;


  const server = createApp({
    store,
    mailer: null,
    google: {}
  }).listen(0);


  await new Promise(resolve => server.once('listening', resolve));


  const base = 'http://127.0.0.1:' + server.address().port + '/api';


  async function request(path, { body, cookie } = {}) {
    return fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(cookie ? { Cookie: cookie } : {})
      },
      ...(body === undefined
        ? {}
        : { body: JSON.stringify(body) })
    });
  }


  try {
    await check({ store, request });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}


const account = {
  firstName: 'Auth',
  lastName: 'Tester',
  email: 'auth@example.test',
  password: 'test-password-12345'
};


function sessionCookie(response) {
  const header = response.headers.get('set-cookie');
  assert.ok(header, 'Expected a session cookie');
  return header.split(';')[0];
}


test('registration normalizes email and stores a verifiable password hash', () =>
  withServer(async ({ store, request }) => {
    const response = await request('/auth/register', {
      body: {
        ...account,
        email: '  AUTH@EXAMPLE.TEST  '
      }
    });


    assert.equal(response.status, 200);


    const result = await response.json();
    assert.equal(result.user.email, account.email);
    assert.equal(result.user.passwordHash, undefined);


    const stored = await store.userByEmail(account.email);
    assert.ok(stored);
    assert.notEqual(stored.passwordHash, account.password);
    assert.equal(
      await verifyPassword(account.password, stored.passwordHash),
      true
    );
  })
);


test('login accepts normalized email and creates an authenticated session', () =>
  withServer(async ({ request }) => {
    const registered = await request('/auth/register', {
      body: account
    });
    assert.equal(registered.status, 200);


    const response = await request('/auth/login', {
      body: {
        email: '  AUTH@EXAMPLE.TEST  ',
        password: account.password
      }
    });


    assert.equal(response.status, 200);


    const cookie = sessionCookie(response);
    const me = await request('/auth/me', { cookie });


    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.email, account.email);
  })
);


test('wrong passwords and unknown emails return the same generic error', () =>
  withServer(async ({ request }) => {
    const registered = await request('/auth/register', {
      body: account
    });
    assert.equal(registered.status, 200);


    const attempts = [
      {
        email: account.email,
        password: 'incorrect-password'
      },
      {
        email: 'missing@example.test',
        password: account.password
      }
    ];


    for (const body of attempts) {
      const response = await request('/auth/login', { body });


      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), {
        error: 'Invalid email or password.'
      });
      assert.equal(
        response.headers.get('set-cookie'),
        null,
        'Failed login must not create a session'
      );
    }
  })
);