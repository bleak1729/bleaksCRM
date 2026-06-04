// Punto de entrada para Vercel serverless functions
// Vercel enruta /api/* hacia aquí; el resto (SPA) lo gestiona outputDirectory
module.exports = require('../server.js');
