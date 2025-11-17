import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Calendar.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Calendar() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    checkConnection();
    loadAppointments();
  }, []);

  const checkConnection = async () => {
    try {
      const token = localStorage.getItem('leadsync_token');
      const response = await axios.get(`${API_URL}/api/calendar/connection/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnected(response.data.connected);
    } catch (error) {
      console.error('Failed to check connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const token = localStorage.getItem('leadsync_token');
      const response = await axios.get(`${API_URL}/api/calendar/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
      setAppointments([]);
    }
  };

  const connectCalendar = async () => {
    try {
      const token = localStorage.getItem('leadsync_token');
      const response = await axios.get(`${API_URL}/api/calendar/auth`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Redirect to Google OAuth URL
      if (response.data.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      alert('Failed to connect calendar. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="calendar-page">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="calendar-page">
        <div className="calendar-header">
          <div className="header-content">
            <div className="header-icon">📅</div>
            <div className="header-text">
              <h1>Calendar</h1>
              <p>Connect your calendar to start booking appointments</p>
            </div>
          </div>
        </div>

        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h2>No Calendar Connected</h2>
          <p>Connect Google Calendar to manage appointments</p>
          <button className="btn-primary" onClick={connectCalendar}>
            <span>🔗</span>
            Connect Google Calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <div className="header-content">
          <div className="header-icon">📅</div>
          <div className="header-text">
            <h1>Calendar</h1>
            <p>Manage your appointments and availability</p>
          </div>
        </div>
      </div>

      <div className="calendar-content">
        <div className="appointments-list">
          <h2>Upcoming Appointments</h2>
          {appointments.length === 0 ? (
            <div className="no-appointments">
              <p>No upcoming appointments</p>
            </div>
          ) : (
            appointments.map(apt => (
              <div key={apt.id} className="appointment-card">
                <div className="appointment-time">
                  {new Date(apt.start_time).toLocaleString()}
                </div>
                <div className="appointment-details">
                  <h3>{apt.attendee_name}</h3>
                  <p>{apt.attendee_email}</p>
                  {apt.attendee_phone && <p>{apt.attendee_phone}</p>}
                </div>
                <div className={`appointment-status status-${apt.status}`}>
                  {apt.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Calendar;
