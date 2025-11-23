#!/usr/bin/env node

/**
 * Google Calendar Setup Helper
 * This script helps verify and configure Google Calendar integration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n=================================================');
  console.log('  Google Calendar Integration Setup Helper');
  console.log('=================================================\n');

  // Check if .env exists
  const envPath = path.join(__dirname, 'backend', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: backend/.env file not found!');
    console.log('\nPlease create backend/.env from backend/.env.example first:');
    console.log('  cp backend/.env.example backend/.env\n');
    rl.close();
    return;
  }

  // Read current .env
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');

  // Check current values
  const currentClientId = envLines.find(line => line.startsWith('GOOGLE_CLIENT_ID='))?.split('=')[1] || '';
  const currentClientSecret = envLines.find(line => line.startsWith('GOOGLE_CLIENT_SECRET='))?.split('=')[1] || '';
  const currentRedirectUri = envLines.find(line => line.startsWith('GOOGLE_REDIRECT_URI='))?.split('=')[1] || '';

  console.log('Current Configuration:');
  console.log('─────────────────────────────────────────────────');

  const isConfigured = !currentClientId.includes('your') &&
                       !currentClientSecret.includes('your') &&
                       currentClientId.length > 20 &&
                       currentClientSecret.length > 10;

  if (isConfigured) {
    console.log('✅ GOOGLE_CLIENT_ID:', currentClientId.substring(0, 20) + '...');
    console.log('✅ GOOGLE_CLIENT_SECRET:', '***' + currentClientSecret.substring(currentClientSecret.length - 4));
    console.log('✅ GOOGLE_REDIRECT_URI:', currentRedirectUri);
    console.log('\n✅ Google Calendar appears to be configured!\n');
  } else {
    console.log('❌ GOOGLE_CLIENT_ID:', currentClientId || '(not set)');
    console.log('❌ GOOGLE_CLIENT_SECRET:', currentClientSecret || '(not set)');
    console.log('⚠️  GOOGLE_REDIRECT_URI:', currentRedirectUri || '(not set)');
    console.log('\n❌ Google Calendar is NOT properly configured.\n');
  }

  console.log('─────────────────────────────────────────────────\n');

  if (!isConfigured) {
    console.log('To configure Google Calendar, you need to:');
    console.log('\n1. Go to Google Cloud Console:');
    console.log('   https://console.cloud.google.com/\n');
    console.log('2. Create a project and enable Google Calendar API\n');
    console.log('3. Create OAuth 2.0 credentials (Web Application)\n');
    console.log('4. Add redirect URI: http://localhost:3001/api/calendar/callback\n');
    console.log('5. Copy your Client ID and Client Secret\n');

    const setupNow = await question('Would you like to enter your credentials now? (y/n): ');

    if (setupNow.toLowerCase() === 'y') {
      console.log('\n');
      const clientId = await question('Enter your Google Client ID: ');
      const clientSecret = await question('Enter your Google Client Secret: ');
      const redirectUri = await question('Enter redirect URI (press Enter for http://localhost:3001/api/calendar/callback): ')
        || 'http://localhost:3001/api/calendar/callback';

      if (!clientId || !clientSecret) {
        console.log('\n❌ Client ID and Secret are required. Exiting without changes.\n');
        rl.close();
        return;
      }

      // Update .env file
      let newEnvContent = envContent;

      // Replace or add GOOGLE_CLIENT_ID
      if (envContent.includes('GOOGLE_CLIENT_ID=')) {
        newEnvContent = newEnvContent.replace(
          /GOOGLE_CLIENT_ID=.*/,
          `GOOGLE_CLIENT_ID=${clientId}`
        );
      } else {
        newEnvContent += `\nGOOGLE_CLIENT_ID=${clientId}`;
      }

      // Replace or add GOOGLE_CLIENT_SECRET
      if (envContent.includes('GOOGLE_CLIENT_SECRET=')) {
        newEnvContent = newEnvContent.replace(
          /GOOGLE_CLIENT_SECRET=.*/,
          `GOOGLE_CLIENT_SECRET=${clientSecret}`
        );
      } else {
        newEnvContent += `\nGOOGLE_CLIENT_SECRET=${clientSecret}`;
      }

      // Replace or add GOOGLE_REDIRECT_URI
      if (envContent.includes('GOOGLE_REDIRECT_URI=')) {
        newEnvContent = newEnvContent.replace(
          /GOOGLE_REDIRECT_URI=.*/,
          `GOOGLE_REDIRECT_URI=${redirectUri}`
        );
      } else {
        newEnvContent += `\nGOOGLE_REDIRECT_URI=${redirectUri}`;
      }

      // Write back to .env
      fs.writeFileSync(envPath, newEnvContent);

      console.log('\n✅ Successfully updated backend/.env!\n');
      console.log('⚠️  IMPORTANT: Restart your backend server to apply changes:\n');
      console.log('   cd backend');
      console.log('   npm start\n');
    }
  } else {
    console.log('Your Google Calendar integration is configured.');
    console.log('\nNext steps:');
    console.log('1. Make sure your backend server is running');
    console.log('2. Open LeadSync in your browser');
    console.log('3. Navigate to the Calendar page');
    console.log('4. Click "Connect Google Calendar"');
    console.log('5. Authorize with your Google account\n');
  }

  const viewGuide = await question('Would you like to open the detailed setup guide? (y/n): ');
  if (viewGuide.toLowerCase() === 'y') {
    console.log('\nPlease read: GOOGLE_CALENDAR_SETUP.md\n');
  }

  console.log('Setup helper complete!\n');
  rl.close();
}

main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
