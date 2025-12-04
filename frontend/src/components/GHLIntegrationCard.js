import { useState, useEffect } from 'react';
import axios from 'axios';
import './GHLIntegrationCard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function GHLIntegrationCard() {
  const [isConnected, setIsConnected] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(true);

  // Working GHL OAuth Install URL
  const GHL_OAUTH_URL =
    'https://marketplace.gohighlevel.com/oauth/chooselocation?' +
    'response_type=code&' +
    'redirect_uri=https%3A%2F%2Fapi.realassistagents.com%2Fapi%2Foauth%2Fredirect&' +
    'client_id=69218dacd101d3222ff1708c-mic4vq7j&' +
    'scope=contacts.readonly+contacts.write+conversations.readonly+conversations.write+' +
    'calendars%2Fevents.readonly+calendars%2Fevents.write+opportunities.readonly+' +
    'opportunities.write+locations.readonly&' +
    'version_id=69218dacd101d3222ff1708c';

  // Get token from localStorage
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    checkConnection();

    // Check if user just came back from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ghl_connected') === 'true') {
      // Refresh connection status
      checkConnection();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
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
    // Redirect to GHL OAuth permission screen
    window.location.href = GHL_OAUTH_URL;
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
