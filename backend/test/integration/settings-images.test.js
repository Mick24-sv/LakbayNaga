import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { makeStore } from '../../src/repositories/memoryStore.js';
import { makeSettingsRepository } from '../../src/repositories/settingsRepository.js';
import { makeImageRepository } from '../../src/repositories/imageRepository.js';
import { validateSettings, SettingsInputError } from '../../src/services/settingsService.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFRsAAAAASUVORK5CYII=', 'base64');
async function fixture(check) {
  const store = makeStore();
  const imageRepository = makeImageRepository();
  const settingsRepository = makeSettingsRepository();
  const server = createApp({ store, imageRepository, settingsRepository }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  const request = (path, method = 'GET', body, cookie = '', type = 'application/json') => fetch(base + path, {
    method, headers: { ...(cookie ? {Cookie:cookie} : {}), ...(body === undefined ? {} : {'Content-Type':type}) },
    ...(body === undefined ? {} : {body: Buffer.isBuffer(body) ? body : JSON.stringify(body)}),
  });
  async function register(email, admin = false) {
    const response = await request('/auth/register','POST',{firstName:'Image',lastName:'Tester',email,password:'test-password-12345'});
    assert.equal(response.status,200);
    if(admin) (await store.userByEmail(email)).role='admin';
    return response.headers.get('set-cookie').split(';')[0];
  }
  try {await check({request,register,imageRepository,settingsRepository});}
  finally {await new Promise(resolve=>server.close(resolve));}
}

test('DB-04: settings reject unknown fields, wrong types, and unsafe URLs',()=>{
 for(const body of [null,[],{siteName:'Unknown'},{logo:null},{hero:123},{account:'https://example.test/image.png'},{logo:'/api/images/not-valid'}]) {
   assert.throws(()=>validateSettings(body),SettingsInputError);
 }
 assert.deepEqual(validateSettings({logo:''}),{logo:''});
});

test('DB-04: guests and ordinary users cannot change settings or upload images',()=>fixture(async({request,register})=>{
 const user=await register('ordinary@example.test');
 for(const [path,method,body,type] of [['/admin/settings','PUT',{logo:''},'application/json'],['/admin/site-images','PUT',{hero:''},'application/json'],['/admin/images','POST',png,'image/png'],['/admin/uploads','POST',png,'image/png']]) {
  assert.equal((await request(path,method,body,'',type)).status,401);
  assert.equal((await request(path,method,body,user,type)).status,403);
 }
 assert.deepEqual(await (await request('/settings')).json(),{logo:'',hero:'',account:''});
}));

test('DB-04: upload and fetch preserve bytes/MIME; settings preserve omitted images and support removal',()=>fixture(async({request,register})=>{
 const admin=await register('admin@example.test',true);
 const uploaded=await request('/admin/uploads','POST',png,admin,'image/png');assert.equal(uploaded.status,201);
 const urls=await uploaded.json();assert.equal(urls.url,urls.imageUrl);
 const response=await request(urls.url.replace('/api',''));assert.equal(response.status,200);
 assert.equal(response.headers.get('content-type'),'image/png');assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),png);
 const first=await request('/admin/settings','PUT',{logo:urls.url,hero:urls.url},admin);assert.equal(first.status,200);
 const second=await request('/admin/site-images','PUT',{account:urls.url},admin);assert.equal(second.status,200);
 assert.deepEqual(await second.json(),{logo:urls.url,hero:urls.url,account:urls.url});
 await request('/admin/settings','PUT',{hero:''},admin);
 assert.deepEqual(await (await request('/site-images')).json(),{logo:urls.url,hero:'',account:urls.url});
 assert.equal((await request('/admin/settings','PUT',{logo:'/api/images/'+'a'.repeat(32)},admin)).status,400);
 assert.equal((await request('/admin/settings','PUT',{unexpected:'value'},admin)).status,400);
 assert.equal((await request('/images/not-an-id')).status,404);
 assert.equal((await request('/images/'+'b'.repeat(32))).status,404);
}));

test('DB-04: uploads reject invalid bytes, MIME mismatch, unsupported types, and oversized bodies',()=>fixture(async({request,register})=>{
 const admin=await register('admin@example.test',true);
 assert.equal((await request('/admin/images','POST',Buffer.from('not an image'),admin,'image/png')).status,400);
 assert.equal((await request('/admin/images','POST',png,admin,'image/jpeg')).status,400);
 assert.equal((await request('/admin/images','POST',Buffer.from('SVG'),admin,'image/svg+xml')).status,400);
 assert.equal((await request('/admin/images','POST',Buffer.from('<svg onload="alert(1)"></svg>'),admin,'image/png')).status,400);
 const maxSizeImage=Buffer.alloc(5*1024*1024);png.copy(maxSizeImage);
 assert.equal((await request('/admin/images','POST',maxSizeImage,admin,'image/png')).status,201);
 assert.equal((await request('/admin/images','POST',Buffer.alloc(5*1024*1024+1),admin,'image/png')).status,413);
}));

test('DB-04: temporary repositories isolate instances and return independent snapshots',async()=>{
 const settings=makeSettingsRepository();await settings.save({logo:'one'});const read=await settings.get();read.logo='changed';assert.equal((await settings.get()).logo,'one');assert.equal((await makeSettingsRepository().get()).logo,'');
 const images=makeImageRepository();const row=await images.create({contentType:'image/png',data:png,uploadedBy:'owner'});row.data[0]=0;
 assert.deepEqual((await images.find(row.id)).data,png);assert.equal(await makeImageRepository().find(row.id),null);
});
