import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { posts } from '../../src/content/blog/index.ts';

const read = (path: string) => readFileSync(new URL(`../../dist/${path}`, import.meta.url), 'utf8');
const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const feed = read('feed.xml');
const llms = read('llms.txt');

for (const post of posts) {
  test(`all published metadata preserves the full article text: ${post.slug}`, () => {
    const html = read(`blog/${post.slug}/index.html`);
    assert.equal(html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1], esc(post.title));
    assert.equal(html.match(/<meta name="description" content="([^"]*)"/)?.[1], esc(post.description));
    const schemas = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const article = schemas.find(s => s['@type'] === 'Article');
    assert.equal(article.headline, post.title);
    assert.equal(article.description, post.description);
    const item = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].find(m => m[1].includes(`/blog/${post.slug}</link>`))?.[1];
    assert(item?.includes(`<title>${esc(post.title)}</title>`), 'RSS title must be complete');
    assert(item?.includes(`<description>${esc(post.description)}</description>`), 'RSS description must be complete');
    assert(llms.includes(`[${post.title}](https://www.gerdbuddy.app/blog/${post.slug}): ${post.description}`), 'AI-facing article index must preserve full text');
  });
}

import { HOME, bigFeatures, moreFeatures, faqItems, homepageSchema } from '../../src/content/homepage.ts';

test('homepage HTML and browser share the same product copy and structured data', () => {
  const html = read('index.html');
  assert.equal(html.match(/<title>(.*?)<\/title>/)?.[1], esc(`${HOME.title} | GERDBuddy`));
  assert.equal(html.match(/<meta name="description" content="([^"]*)"/)?.[1], esc(HOME.description));
  assert.equal(html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1], esc(HOME.heroLines.join(' ')));
  for (const value of [HOME.intro, HOME.founder, ...[...bigFeatures, ...moreFeatures].flatMap(f => [f.title, f.body]), ...faqItems.flatMap(f => [f.q, f.a])]) {
    assert.ok(html.includes(esc(value)), `Missing homepage text: ${value}`);
  }
  const schema = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));
  assert.deepEqual(schema, homepageSchema);
});

test('prerendered metadata is owned by Helmet so route changes replace it', () => {
  for (const path of ['index.html', 'blog/gerdbuddy-vs-mysymptoms/index.html']) {
    const html = read(path);
    const tags = html.match(/<meta (?:name="description"|property="[^"]+")[^>]*>|<link rel="canonical"[^>]*>|<script type="application\/ld\+json"[^>]*>/g) || [];
    assert.ok(tags.length > 10);
    for (const tag of tags) assert.ok(tag.includes('data-rh="true"'), `Missing Helmet ownership: ${tag}`);
  }
  assert.match(read('blog/gerdbuddy-vs-mysymptoms/index.html'), /property="og:type" content="article"/);
});
