'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateRecoveryKey } = require('../lib/auth');

test('generateRecoveryKey tiene formato XXXX-XXXX-XXXX-XXXX', () => {
  for (let i = 0; i < 20; i++) {
    const key = generateRecoveryKey();
    assert.match(key, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  }
});

test('generateRecoveryKey no repite claves', () => {
  const keys = new Set(Array.from({ length: 100 }, generateRecoveryKey));
  assert.equal(keys.size, 100);
});
