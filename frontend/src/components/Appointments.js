import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Appointments.css';
import '../styles/LeadSync-DesignSystem.css';
import '../styles/pages-modern.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ghlConnected, setGhlConnected] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [formData, setFormData] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    appointmentType: '',
    location: '',
    notes: '',
    syncToGHL: false,
    calendarId: ''
  });

  useEffect(() => {
    loadAppointments();
    checkGHLStatus();
  }, []);

  const checkGHLStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ghl/status?userId=default_user`);
      setGhlConnected(response.data.connected);

      if (response.data.connected) {
        const calendarsResponse = await axios.get(`${API_URL}/api/ghl/calendars?userId=default_user`);
        setCalendars(calendarsResponse.data.calendars || []);
      }
    } catch (error) {
      console.error('Error checking GHL status:', error);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/appointments?userId=default_user`);
      setAppointments(response.data.appointments || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API_URL}/api/appointments`, {
        ...formData,
        userId: 'default_user'
      });

      setShowCreateModal(false);
      setFormData({
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        appointmentType: '',
        location: '',
        notes: '',
        syncToGHL: false,
        calendarId: ''
      });
      loadAppointments();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment');
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/appointments/${id}?userId=default_user`);
      loadAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment');
    }
  };

  const handleSyncFromGHL = async () => {
    if (!formData.calendarId) {
      alert('Please select a calendar first');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/appointments/sync`, {
        userId: 'default_user',
        calendarId: formData.calendarId
      });

      alert(`Synced ${response.data.synced} new appointments and updated ${response.data.updated} existing appointments`);
      loadAppointments();
    } catch (error) {
      console.error('Error syncing from GHL:', error);
      alert('Failed to sync appointments');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      scheduled: 'status-scheduled',
      confirmed: 'status-confirmed',
      cancelled: 'status-cancelled',
      completed: 'status-completed',
      no_show: 'status-no-show'
    };

    return (
      <span className={`status-badge ${statusColors[status] || ''}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments
      .filter(apt => {
        const aptDate = new Date(apt.start_time);
        return aptDate >= now && apt.status !== 'cancelled' && apt.status !== 'completed';
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .slice(0, 5);
  };

  const getTodayAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time);
      return aptDate >= today && aptDate < tomorrow;
    });
  };

  const getAppointmentsByStatus = () => {
    const counts = {
      scheduled: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0
    };

    appointments.forEach(apt => {
      if (counts.hasOwnProperty(apt.status)) {
        counts[apt.status]++;
      }
    });

    return counts;
  };

  const stats = getAppointmentsByStatus();
  const upcoming = getUpcomingAppointments();
  const today = getTodayAppointments();

  if (loading) {
    return (
      <div className="appointments-container">
        <div className="loading">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="modern-page-header">
        <div className="modern-page-title">
          <div className="modern-page-icon">📅</div>
          <div className="modern-page-title-text">
            <h1>Appointments</h1>
            <p>Manage and schedule your appointments</p>
          </div>
        </div>
        <div className="modern-page-actions">
          {ghlConnected && calendars.length > 0 && (
            <button className="modern-btn modern-btn-secondary" onClick={handleSyncFromGHL}>
              Sync from GHL
            </button>
          )}
          <button className="modern-btn modern-btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Appointment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e3f2fd' }}>📅</div>
          <div className="stat-content">
            <div className="stat-value">{appointments.length}</div>
            <div className="stat-label">Total Appointments</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff3e0' }}>⏰</div>
          <div className="stat-content">
            <div className="stat-value">{today.length}</div>
            <div className="stat-label">Today</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e8f5e9' }}>✓</div>
          <div className="stat-content">
            <div className="stat-value">{stats.confirmed}</div>
            <div className="stat-label">Confirmed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fce4ec' }}>✗</div>
          <div className="stat-content">
            <div className="stat-value">{stats.cancelled}</div>
            <div className="stat-label">Cancelled</div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      {upcoming.length > 0 && (
        <div className="upcoming-section">
          <h2>Upcoming Appointments</h2>
          <div className="appointments-list">
            {upcoming.map(appointment => (
              <div key={appointment.id} className="appointment-card">
                <div className="appointment-time">
                  <div className="date">{formatDate(appointment.start_time)}</div>
                  <div className="time">{formatTime(appointment.start_time)}</div>
                </div>
                <div className="appointment-details">
                  <h3>{appointment.title}</h3>
                  <div className="appointment-meta">
                    <span>👤 {appointment.contact_name}</span>
                    {appointment.contact_phone && <span>📞 {appointment.contact_phone}</span>}
                    {appointment.location && <span>📍 {appointment.location}</span>}
                  </div>
                  {appointment.notes && (
                    <p className="appointment-notes">{appointment.notes}</p>
                  )}
                </div>
                <div className="appointment-actions">
                  {getStatusBadge(appointment.status)}
                  {appointment.synced_to_ghl && (
                    <span className="sync-badge" title="Synced to GHL">🔄</span>
                  )}
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleDeleteAppointment(appointment.id)}
                    title="Delete appointment"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Appointments */}
      <div className="all-appointments-section">
        <h2>All Appointments</h2>
        <div className="appointments-list">
          {appointments.length === 0 ? (
            <div className="empty-state">
              <p>No appointments scheduled yet</p>
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                Create Your First Appointment
              </button>
            </div>
          ) : (
            appointments.map(appointment => (
              <div key={appointment.id} className="appointment-card">
                <div className="appointment-time">
                  <div className="date">{formatDate(appointment.start_time)}</div>
                  <div className="time">{formatTime(appointment.start_time)}</div>
                </div>
                <div className="appointment-details">
                  <h3>{appointment.title}</h3>
                  <div className="appointment-meta">
                    <span>👤 {appointment.contact_name}</span>
                    {appointment.contact_phone && <span>📞 {appointment.contact_phone}</span>}
                    {appointment.contact_email && <span>✉️ {appointment.contact_email}</span>}
                    {appointment.location && <span>📍 {appointment.location}</span>}
                  </div>
                  {appointment.notes && (
                    <p className="appointment-notes">{appointment.notes}</p>
                  )}
                </div>
                <div className="appointment-actions">
                  {getStatusBadge(appointment.status)}
                  {appointment.synced_to_ghl && (
                    <span className="sync-badge" title="Synced to GHL">🔄</span>
                  )}
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleDeleteAppointment(appointment.id)}
                    title="Delete appointment"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Appointment</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateAppointment} className="appointment-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Name *</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Appointment Type</label>
                  <input
                    type="text"
                    value={formData.appointmentType}
                    onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value })}
                    placeholder="e.g., Consultation, Follow-up"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Brief appointment title"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Physical address or virtual meeting link"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional notes or requirements"
                />
              </div>

              {ghlConnected && calendars.length > 0 && (
                <>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.syncToGHL}
                        onChange={(e) => setFormData({ ...formData, syncToGHL: e.target.checked })}
                      />
                      <span>Sync to GoHighLevel</span>
                    </label>
                  </div>

                  {formData.syncToGHL && (
                    <div className="form-group">
                      <label>GHL Calendar</label>
                      <select
                        value={formData.calendarId}
                        onChange={(e) => setFormData({ ...formData, calendarId: e.target.value })}
                        required={formData.syncToGHL}
                      >
                        <option value="">Select a calendar</option>
                        {calendars.map(cal => (
                          <option key={cal.id} value={cal.id}>{cal.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;
