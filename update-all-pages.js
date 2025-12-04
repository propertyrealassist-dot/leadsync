// Quick script to show which files need updating
const fs = require('fs');
const path = require('path');

const pages = [
  'C:/Users/Kurtv/Desktop/leadsync/frontend/src/components/Conversations.js',
  'C:/Users/Kurtv/Desktop/leadsync/frontend/src/components/Appointments.js',
  'C:/Users/Kurtv/Desktop/leadsync/frontend/src/components/CoPilot.js',
  'C:/Users/Kurtv/Desktop/leadsync/frontend/src/components/Integrations.js',
];

pages.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${path.basename(file)} exists`);
  } else {
    console.log(`❌ ${path.basename(file)} NOT FOUND`);
  }
});
