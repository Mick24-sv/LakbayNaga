import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../../src/app.js';


async function withServer(check) {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));


  const base = 'http://127.0.0.1:' + server.address().port;


  try {
    await check(base);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}


test('health endpoint returns HTTP 200 and status ok', () =>
  withServer(async base => {
    const response = await fetch(base + '/api/health');


    assert.equal(response.status, 200);
    assert.ok(
      response.headers.get('content-type')?.includes('application/json')
    );


    assert.deepEqual(await response.json(), {
      status: 'ok'
    });
  })
);


test('unknown API endpoints return a JSON 404 error', () =>
  withServer(async base => {
    const response = await fetch(base + '/api/does-not-exist');


    assert.equal(response.status, 404);
    assert.ok(
      response.headers.get('content-type')?.includes('application/json')
    );


    const body = await response.json();
    assert.equal(typeof body.error, 'string');
    assert.ok(body.error.length > 0);
  })
);