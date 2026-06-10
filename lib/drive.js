'use strict';
const fs = require('fs');
const { google } = require('googleapis');
const { DRIVE_KEY_FILE } = require('./config');

async function getDrive() {
  if (!DRIVE_KEY_FILE || !fs.existsSync(DRIVE_KEY_FILE)) return null;
  const auth = new google.auth.GoogleAuth({
    keyFile: DRIVE_KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

async function createDriveFolder(name, parentId) {
  const drive = await getDrive();
  if (!drive || !parentId) return null;
  try {
    const { data } = await drive.files.create({
      requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
      fields: 'id,webViewLink',
    });
    return data.webViewLink || null;
  } catch { return null; }
}

module.exports = { getDrive, createDriveFolder };
