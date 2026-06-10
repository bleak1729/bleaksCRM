'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractSocialLinks } = require('../lib/social-scan');

test('extractSocialLinks encuentra perfiles en HTML', () => {
  const html = `
    <a href="https://www.instagram.com/barpepe">IG</a>
    <a href="https://facebook.com/barpepe/">FB</a>
    <a href="https://www.linkedin.com/company/bar-pepe">LI</a>
    <a href="https://tiktok.com/@barpepe">TT</a>
  `;
  const found = extractSocialLinks(html);
  assert.equal(found.instagram, 'https://www.instagram.com/barpepe');
  assert.equal(found.facebook, 'https://facebook.com/barpepe');
  assert.equal(found.linkedin, 'https://www.linkedin.com/company/bar-pepe');
  assert.equal(found.tiktok, 'https://tiktok.com/@barpepe');
});

test('extractSocialLinks ignora URLs de compartir/explorar', () => {
  const html = `
    <a href="https://www.facebook.com/sharer/sharer.php?u=x">share</a>
    <a href="https://www.instagram.com/explore/tags/bares">explore</a>
    <a href="https://twitter.com/intent/tweet?text=hola">tweet</a>
  `;
  const found = extractSocialLinks(html);
  assert.equal(found.facebook, undefined);
  assert.equal(found.instagram, undefined);
  assert.equal(found.twitter, undefined);
});

test('extractSocialLinks devuelve objeto vacío sin redes', () => {
  assert.deepEqual(extractSocialLinks('<p>hola</p>'), {});
});
