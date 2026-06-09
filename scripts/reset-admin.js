#!/usr/bin/env node
/**
 * Script de emergencia: resetea la contraseña del admin y genera una clave de recuperación.
 * Uso:  node scripts/reset-admin.js <nueva-contraseña>
 */
'use strict';
require('dotenv').config();
const bcrypt       = require('bcryptjs');
const crypto       = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env');
  process.exit(1);
}

const newPassword = process.argv[2];
if (!newPassword || newPassword.length < 6) {
  console.error('❌  Uso: node scripts/reset-admin.js <nueva-contraseña>  (mín. 6 caracteres)');
  process.exit(1);
}

function generateRecoveryKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('')
  );
  return groups.join('-');
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const { data: users, error: fetchErr } = await supabase.from('users').select('*').limit(1);
  if (fetchErr) { console.error('❌  Error al conectar con Supabase:', fetchErr.message); process.exit(1); }
  if (!users || users.length === 0) { console.error('❌  No hay ningún usuario en la base de datos.'); process.exit(1); }

  const user = users[0];
  const recoveryKey  = generateRecoveryKey();
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const recoveryHash = await bcrypt.hash(recoveryKey, 10);

  const { error: updateErr } = await supabase
    .from('users')
    .update({ password_hash: passwordHash, recovery_key_hash: recoveryHash })
    .eq('id', user.id);

  if (updateErr) { console.error('❌  Error al actualizar:', updateErr.message); process.exit(1); }

  console.log('\n✅  Contraseña y clave de recuperación actualizadas.\n');
  console.log(`  Usuario:            ${user.username}`);
  console.log(`  Nueva contraseña:   ${newPassword}`);
  console.log(`  Clave recuperación: ${recoveryKey}\n`);
  console.log('⚠️   Guarda la clave de recuperación. No se vuelve a mostrar.\n');
}

main();
