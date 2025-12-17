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

    // CRITICAL: Include conversations/message scopes for AI to read/send messages
    return (
      'https://marketplace.leadconnectorhq.com/oauth/chooselocation?' +
      'response_type=code&' +
      'redirect_uri=https%3A%2F%2Fapi.realassistagents.com%2Fapi%2Foauth%2Fredirect&' +
      'client_id=69218dacd101d3222ff1708c-mic4vq7j&' +
      'scope=contacts.readonly+contacts.write+conversations.readonly+conversations.write+' +
      'calendars%2Fevents.readonly+opportunities.readonly+opportunities.write+locations.readonly+' +
      'calendars%2Fevents.write+conversations%2Fmessage.readonly+conversations%2Fmessage.write&' +
      'version_id=69218dacd101d3222ff1708c&' +
      `state=${encodeURIComponent(state)}`
    );
  };

  useEffect(() => {
    checkConnection();

    // Check if user just came back from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('leadconnector_connected') === 'true' || urlParams.get('connected') === 'true') {
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
      const response = await axios.get(`${API_URL}/api/leadconnector/status`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setIsConnected(response.data.connected || false);
      if (response.data.connected) {
        setLocationName(response.data.locationId || 'LeadConnector');
      }
    } catch (error) {
      console.error('Error checking LeadConnector connection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Generate OAuth URL with user ID in state parameter
    const oauthURL = getOAuthURL();

    // CRITICAL: Mark this as OAuth flow to prevent auto-logout on return
    sessionStorage.setItem('activeSession', 'true');
    sessionStorage.setItem('oauthInProgress', 'true');

    if (!oauthURL) {
      alert('Unable to connect: User not authenticated. Please refresh the page.');
      return;
    }

    console.log('🔐 ========================================');
    console.log('🔐 Starting LeadConnector OAuth Flow');
    console.log('🔐 ========================================');
    console.log('User ID:', user.id);
    console.log('OAuth URL:', oauthURL);
    console.log('========================================');

    // Redirect to LeadConnector OAuth permission screen
    window.location.href = oauthURL;
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect LeadConnector?')) {
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/leadconnector/disconnect`,
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
        alert('✅ Disconnected from LeadConnector');
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
          <h3>LeadConnector</h3>
          <p>Complete CRM integration with contacts, calendars, and conversations</p>
        </div>
      </div>

      {!isConnected && (
        <button
          className="ghl-connect-btn"
          onClick={handleConnect}
        >
          Connect to LeadConnector
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
