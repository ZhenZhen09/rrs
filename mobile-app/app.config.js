const fs = require('node:fs');

if (process.env.GOOGLE_SERVICES_JSON) {
  fs.copyFileSync(process.env.GOOGLE_SERVICES_JSON, './google-services.json');
}

module.exports = require('./app.json');
