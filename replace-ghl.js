#!/usr/bin/env node

/**
 * Script to replace all GHL references with LeadConnector equivalents
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // Variable names
  { from: /\bghlStatus\b/g, to: 'leadConnectorStatus' },
  { from: /\bcheckGHL/g, to: 'checkLeadConnector' },
  { from: /\bhandleConnectGHL\b/g, to: 'handleConnectLeadConnector' },
  { from: /\bhandleDisconnectGHL\b/g, to: 'handleDisconnectLeadConnector' },
  { from: /\bghl_connected\b/g, to: 'leadconnector_connected' },
  { from: /\bghl_error\b/g, to: 'leadconnector_error' },
  { from: /\bghl_connecting_user\b/g, to: 'leadconnector_connecting_user' },
  { from: /\bghl_contact_id\b/g, to: 'leadconnector_contact_id' },

  // API routes
  { from: /\/api\/ghl\//g, to: '/api/leadconnector/' },

  // Component/File names (leave as is - will rename manually)
  // { from: /GHLIntegrationCard/g, to: 'LeadConnectorIntegrationCard' },

  // CSS classes (keep ghl- prefix for now to avoid breaking styles)
  // Comments and labels
  { from: /GHL Tag/g, to: 'LeadConnector Tag' },
  { from: /GHL Calendar/g, to: 'LeadConnector Calendar' },
  { from: /GHL Contact ID/g, to: 'LeadConnector Contact ID' },
  { from: /GHL Snapshot/g, to: 'LeadConnector Snapshot' },
  { from: /GHL Integration/g, to: 'LeadConnector Integration' },
  { from: /GHL API/g, to: 'LeadConnector API' },
  { from: /GHL not connected/g, to: 'LeadConnector not connected' },
  { from: /GHL calendars/g, to: 'LeadConnector calendars' },
  { from: /pre-configured GHL/g, to: 'pre-configured LeadConnector' },
  { from: /access GHL calendars/g, to: 'access LeadConnector calendars' },
  { from: /Sync from GHL/g, to: 'Sync from LeadConnector' },
  { from: /Synced to GHL/g, to: 'Synced to LeadConnector' },
  { from: /import snapshot.*into GHL/gi, to: 'import snapshot into LeadConnector' },
  { from: /in GHL Custom Values/g, to: 'in LeadConnector Custom Values' },
  { from: /Error checking GHL/g, to: 'Error checking LeadConnector' },
  { from: /Error disconnecting GHL/g, to: 'Error disconnecting LeadConnector' },
  { from: /Error loading GHL/g, to: 'Error loading LeadConnector' },
  { from: /Error syncing from GHL/g, to: 'Error syncing from LeadConnector' },
  { from: /Redirect to GHL/g, to: 'Redirect to LeadConnector' },
  { from: /redirects to GHL marketplace/g, to: 'redirects to LeadConnector marketplace' },
];

const filesToUpdate = [
  'frontend/src/components/AIAgents.js',
  'frontend/src/components/Appointments.js',
  'frontend/src/components/Auth.js',
  'frontend/src/components/AuthModal.js',
  'frontend/src/components/Conversations.js',
  'frontend/src/components/GHLIntegrationCard.js',
  'frontend/src/components/Integrations.js',
  'frontend/src/components/Register.js',
  'frontend/src/components/Settings.js',
  'frontend/src/components/StrategyEditor.js',
  'frontend/src/components/WorkflowBuilder.jsx',
  'frontend/src/pages/Leads.js',
];

console.log('🔄 Replacing all GHL references with LeadConnector...\n');

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} (not found)`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changesMade = 0;

  replacements.forEach(({ from, to }) => {
    const before = content;
    content = content.replace(from, to);
    if (content !== before) changesMade++;
  });

  if (changesMade > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file} - ${changesMade} replacements made`);
  } else {
    console.log(`ℹ️  ${file} - no changes needed`);
  }
});

console.log('\n✅ All GHL references replaced with LeadConnector!');
console.log('\n📝 Next steps:');
console.log('1. Update backend API routes from /api/ghl to /api/leadconnector');
console.log('2. Test all functionality');
console.log('3. Commit changes');
