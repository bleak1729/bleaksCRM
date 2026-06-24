'use strict';
/**
 * Resetea la contraseña de un usuario y genera una nueva clave de recuperación.
 * Uso: node scripts/reset-password.js
 */
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USERNAME     = 'Bleak';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en el .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function randomPassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length }, () => chars[crypto.randomInt(chars.length)]).join('');
}

function generateRecoveryKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('')
  );
  return groups.join('-');
}

async function main() {
  console.log(`\n🔄  Reseteando usuario: ${USERNAME}\n`);

  const { data: users, error: fetchErr } = await supabase
    .from('users').select('id').eq('username', USERNAME).limit(1);

  if (fetchErr) { console.error('❌  Error al buscar usuario:', fetchErr.message); process.exit(1); }
  if (!users?.length) { console.error(`❌  Usuario "${USERNAME}" no encontrado`); process.exit(1); }

  const newPassword   = randomPassword();
  const recoveryKey   = generateRecoveryKey();
  const passwordHash  = await bcrypt.hash(newPassword, 12);
  const recoveryHash  = await bcrypt.hash(recoveryKey, 10);

  const { error: updateErr } = await supabase
    .from('users')
    .update({ password_hash: passwordHash, recovery_key_hash: recoveryHash })
    .eq('username', USERNAME);

  if (updateErr) { console.error('❌  Error al actualizar:', updateErr.message); process.exit(1); }

  console.log('✅  Contraseña reseteada con éxito\n');
  console.log('══════════════════════════════════════');
  console.log(`  Usuario:            ${USERNAME}`);
  console.log(`  Nueva contraseña:   ${newPassword}`);
  console.log(`  Clave recuperación: ${recoveryKey}`);
  console.log('══════════════════════════════════════');
  console.log('\n⚠️  Guarda estos datos en un lugar seguro. No se mostrarán de nuevo.\n');
}

main();
