'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toSafePublicUrl, isPrivateIp } = require('../lib/url-guard');

test('toSafePublicUrl acepta dominios públicos y añade https://', () => {
  assert.equal(toSafePublicUrl('example.com'), 'https://example.com/');
  assert.equal(toSafePublicUrl('http://example.com/contacto'), 'http://example.com/contacto');
});

test('toSafePublicUrl rechaza hosts privados y loopback (SSRF)', () => {
  assert.equal(toSafePublicUrl('http://localhost:3000'), null);
  assert.equal(toSafePublicUrl('http://127.0.0.1/admin'), null);
  assert.equal(toSafePublicUrl('http://192.168.1.1'), null);
  assert.equal(toSafePublicUrl('http://10.0.0.5'), null);
  assert.equal(toSafePublicUrl('http://169.254.169.254/latest/meta-data'), null);  // metadata cloud
  assert.equal(toSafePublicUrl('http://172.16.0.1'), null);
  assert.equal(toSafePublicUrl('http://servidor.local'), null);
});

test('toSafePublicUrl rechaza esquemas no http(s) y basura', () => {
  assert.equal(toSafePublicUrl('file:///etc/passwd'), null);
  assert.equal(toSafePublicUrl('ftp://example.com'), null);
  assert.equal(toSafePublicUrl(''), null);
  assert.equal(toSafePublicUrl(null), null);
  assert.equal(toSafePublicUrl('Sin web — 600111222'), null);
});

test('isPrivateIp cubre IPv6 loopback y rangos privados', () => {
  assert.equal(isPrivateIp('::1'), true);
  assert.equal(isPrivateIp('fe80::1'), true);
  assert.equal(isPrivateIp('8.8.8.8'), false);
  assert.equal(isPrivateIp('100.64.0.1'), true);   // CGNAT
});
