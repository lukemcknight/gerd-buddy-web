import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import { articleRemarkPlugins } from '../markdown.ts';
import { posts } from '../../content/blog/index.ts';

for (const slug of ['best-gerd-tracking-apps', 'gerdbuddy-vs-mysymptoms']) {
  test(`comparison pricing renders as a semantic table: ${slug}`, () => {
    const post = posts.find(p => p.slug === slug)!;
    const html = renderToStaticMarkup(createElement(ReactMarkdown, { remarkPlugins: articleRemarkPlugins, children: post.content }));
    assert.match(html, /<table>/);
    assert.match(html, /<td>[^<]*\$14\.99/);
    assert.match(html, /<th>/);
  });
}
