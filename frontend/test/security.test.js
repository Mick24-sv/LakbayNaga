import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
let vite;
let AttractionStoryCard;

before(async () => {
  vite = await createServer({
    root: frontendRoot,
    configFile: path.join(frontendRoot, 'vite.config.js'),
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false },
  });
  ({ default: AttractionStoryCard } = await vite.ssrLoadModule('/src/components/attractions/AttractionStoryCard.jsx'));
});

after(async () => { await vite?.close(); });

test('SEC-05: attraction card renders hostile names and descriptions as escaped text', () => {
  const place = {
    id: 'safe-id',
    name: '<script>alert("name")</script>',
    category: '<b>category</b>',
    area: '<img src=x onerror=alert("area")>',
    description: '</p><svg onload=alert("description")></svg>',
    imageUrl: '/assets/placeholder.svg',
  };
  const markup = renderToStaticMarkup(React.createElement(AttractionStoryCard, { place }));

  assert.ok(markup.includes('&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;'));
  assert.ok(markup.includes('&lt;img src=x onerror=alert(&quot;area&quot;)&gt;'));
  assert.ok(markup.includes('&lt;/p&gt;&lt;svg onload=alert(&quot;description&quot;)&gt;&lt;/svg&gt;'));
  assert.ok(!markup.includes('<script>'));
  assert.ok(!markup.includes('<svg'));
});

test('SEC-05: attraction cards do not render unsafe image URLs', () => {
  for (const imageUrl of [
    'javascript:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>',
    'https://attacker.example/image.png', '//attacker.example/image.png',
    '/assets/../private.svg', '/api/images/not-a-valid-id',
  ]) {
    const markup = renderToStaticMarkup(React.createElement(AttractionStoryCard, {
      place: { id: 'unsafe-photo', name: 'Unsafe photo', description: 'Fixture', imageUrl },
    }));
    assert.ok(!markup.includes('<img'), imageUrl);
    assert.ok(markup.includes('story-card-no-photo'), imageUrl);
  }
});

test('SEC-05: valid same-origin image URLs continue to render', () => {
  const markup = renderToStaticMarkup(React.createElement(AttractionStoryCard, {
    place: { id: 'valid-photo', name: 'Safe photo', imageUrl: '/api/images/' + 'a'.repeat(32) },
  }));
  assert.ok(markup.includes('src="/api/images/' + 'a'.repeat(32) + '"'));
});
