import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './GHLIntegrationCard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function GHLIntegrationCard() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(true);

  // Get token from localStorage
  const getToken = () => localStorage.getItem('token');

  // Generate OAuth URL with state parameter containing userId
  const getOAuthURL = () => {
    if (!user?.id) {
      console.error('No user ID available for OAuth');
      return null;
    }

    // Encode user ID in state parameter (base64 encoded JSON)
    const stateData = JSON.stringify({ userId: user.id, timestamp: Date.now() });
    const state = btoa(stateData);

    // Use exact scopes from GHL marketplace app
    const scopes = [
      'contacts.readonly',
      'contacts.write',
      'conversations.readonly',
      'conversations.write',
      'conversations/message.readonly',
      'conversations/message.write',
      'calendars/events.readonly',
      'calendars/events.write',
      'opportunities.readonly',
      'opportunities.write',
      'locations.readonly'
    ].join(' ');

    return (
      'https://marketplace.gohighlevel.com/oauth/chooselocation?' +
      'response_type=code&' +
      'redirect_uri=https%3A%2F%2Fapi.realassistagents.com%2Fapi%2Foauth%2Fredirect&' +
      'client_id=69218dacd101d3222ff1708c-mic4vq7j&' +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${encodeURIComponent(state)}`
    );
  };

  useEffect(() => {
    checkConnection();

    // Check if user just came back from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ghl_connected') === 'true' || urlParams.get('connected') === 'true') {
      console.log('✅ OAuth callback detected - refreshing connection status');
      // Refresh connection status
      setTimeout(() => {
        checkConnection();
      }, 500); // Small delay to ensure backend has saved the data
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkConnection = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ghl/status`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setIsConnected(response.data.connected || false);
      if (response.data.connected) {
        setLocationName(response.data.locationId || 'GoHighLevel');
      }
    } catch (error) {
      console.error('Error checking GHL connection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Generate OAuth URL with user ID in state parameter
    const oauthURL = getOAuthURL();

    if (!oauthURL) {
      alert('Unable to connect: User not authenticated. Please refresh the page.');
      return;
    }

    console.log('🔐 ========================================');
    console.log('🔐 Starting GHL OAuth Flow');
    console.log('🔐 ========================================');
    console.log('User ID:', user.id);
    console.log('OAuth URL:', oauthURL);
    console.log('');
    console.log('If you see "Invalid Authorization!" error:');
    console.log('1. Check GHL Marketplace App redirect URI matches exactly');
    console.log('2. Verify all scopes are enabled in GHL app settings');
    console.log('3. Ensure app is Published or in Test Mode with your account added');
    console.log('========================================');

    // Redirect to GHL OAuth permission screen
    window.location.href = oauthURL;
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect GoHighLevel?')) {
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/ghl/disconnect`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        }
      );

      if (response.data.success || response.status === 200) {
        setIsConnected(false);
        setLocationName('');
        alert('✅ Disconnected from GoHighLevel');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('Failed to disconnect. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="ghl-integration-card">
        <div className="ghl-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="ghl-integration-card">
      <div className="ghl-header">
        <div className="ghl-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="url(#ghl-gradient)"/>
            <path d="M14 18h20M14 24h20M14 30h20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <defs>
              <linearGradient id="ghl-gradient" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stopColor="#8b5cf6"/>
                <stop offset="100%" stopColor="#ec4899"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="ghl-info">
          <h3>GoHighLevel</h3>
          <p>Complete CRM integration with contacts, calendars, and conversations</p>
        </div>
      </div>

      {!isConnected && (
        <button
          className="ghl-connect-btn"
          onClick={handleConnect}
        >
          Connect to GoHighLevel
        </button>
      )}

      {isConnected && (
        <div className="ghl-connected">
          <div className="ghl-connection-badge">
            <span className="ghl-status-dot"></span>
            <span>Connected to {locationName}</span>
          </div>
          <button
            className="ghl-disconnect-btn"
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export default GHLIntegrationCard;
