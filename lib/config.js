'use strict';
require('dotenv').config();

const { version } = require('../package.json');

const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  if (IS_PROD) {
    throw new Error('JWT_SECRET no definido. Configura la variable de entorno antes de arrancar en producción.');
  }
  console.warn('⚠  JWT_SECRET no definido — usando secreto de desarrollo (NO válido para producción)');
}

module.exports = {
  VERSION:              version,
  IS_PROD,
  PORT:                 process.env.PORT || 3000,
  GOOGLE_API_KEY:       process.env.GOOGLE_MAPS_API_KEY || '',
  SUPABASE_URL:         process.env.SUPABASE_URL || '',
  SUPABASE_KEY:         process.env.SUPABASE_SERVICE_KEY || '',
  JWT_SECRET:           JWT_SECRET || 'dev-secret-solo-local',
  DRIVE_KEY_FILE:       process.env.GOOGLE_DRIVE_KEY_FILE || '',
  DRIVE_ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',
};
