import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BookingWidget.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function BookingWidget({ templateId, onClose }) {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (step === 2) {
      loadAvailability();
    }
  }, [selectedDate, step]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await axios.get(
        `${API_URL}/api/booking/availability/${templateId}?date=${dateStr}`
      );
      setAvailableSlots(response.data.slots || []);
    } catch (error) {
      console.error('Failed to load availability:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/booking/book/${templateId}`, {
        ...formData,
        startTime: selectedSlot.start
      });
      setBooked(true);
    } catch (error) {
      console.error('Booking failed:', error);
      alert(error.response?.data?.error || 'Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (booked) {
    return (
      <div className="booking-widget">
        <div className="booking-success">
          <div className="success-icon">✅</div>
          <h2>Appointment Booked!</h2>
          <p>Check your email for confirmation and meeting details.</p>
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-widget">
      <div className="booking-header">
        <h2>Book an Appointment</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {step === 1 && (
        <div className="booking-step">
          <h3>Your Information</h3>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="john@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Anything we should know?"
              rows={3}
            />
          </div>
          <button
            className="btn-primary"
            onClick={() => setStep(2)}
            disabled={!formData.name || !formData.email}
          >
            Next: Choose Time
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="booking-step">
          <h3>Select Date & Time</h3>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
            min={new Date().toISOString().split('T')[0]}
            className="date-picker"
          />

          {loading ? (
            <div className="loading-spinner"></div>
          ) : (
            <div className="time-slots">
              {availableSlots.length === 0 ? (
                <p className="no-slots">No available slots for this date</p>
              ) : (
                availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    className={`time-slot ${selectedSlot?.start === slot.start ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot.display}
                  </button>
                ))
              )}
            </div>
          )}

          <div className="booking-actions">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="btn-primary"
              onClick={handleBooking}
              disabled={!selectedSlot || loading}
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingWidget;
