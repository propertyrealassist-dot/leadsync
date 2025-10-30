import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CalendarPicker.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function CalendarPicker({ calendarId, onSlotSelected }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (calendarId && selectedDate) {
      loadAvailableSlots();
    }
  }, [calendarId, selectedDate]);

  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('leadsync_token');
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const response = await axios.get(`${API_URL}/api/calendar/slots`, {
        params: {
          calendarId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      setAvailableSlots(response.data.slots || []);
    } catch (error) {
      console.error('Error loading slots:', error);
      // Show fallback slots for demo purposes
      setAvailableSlots(generateDemoSlots());
    } finally {
      setLoading(false);
    }
  };

  const generateDemoSlots = () => {
    // Generate demo slots for demonstration
    const slots = [];
    const baseDate = new Date(selectedDate);
    baseDate.setHours(9, 0, 0, 0);

    for (let i = 0; i < 16; i++) {
      const slotStart = new Date(baseDate.getTime() + i * 30 * 60000);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

      // Skip lunch hour (12:00-13:00)
      if (slotStart.getHours() !== 12) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: true
        });
      }
    }

    return slots;
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
    setSelectedSlot(null);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
    setSelectedSlot(null);
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    if (onSlotSelected) {
      onSlotSelected(slot);
    }
  };

  return (
    <div className="calendar-picker">
      <div className="date-selector">
        <button
          className="nav-button"
          onClick={handlePreviousDay}
          aria-label="Previous day"
        >
          ←
        </button>
        <h3 className="selected-date">
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h3>
        <button
          className="nav-button"
          onClick={handleNextDay}
          aria-label="Next day"
        >
          →
        </button>
      </div>

      <div className="slots-container">
        {loading ? (
          <div className="loading-slots">
            <div className="spinner"></div>
            <p>Loading available times...</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="no-slots">
            <div className="no-slots-icon">📅</div>
            <h4>No available slots</h4>
            <p>Please try a different date</p>
          </div>
        ) : (
          <div className="slots-grid">
            {availableSlots.map((slot, idx) => (
              <button
                key={idx}
                className={`slot-button ${selectedSlot?.start === slot.start ? 'selected' : ''}`}
                onClick={() => handleSlotClick(slot)}
              >
                {new Date(slot.start).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedSlot && (
        <div className="selected-slot-info">
          <p>
            <strong>Selected:</strong>{' '}
            {new Date(selectedSlot.start).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            })}{' '}
            -  {' '}
            {new Date(selectedSlot.end).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}
    </div>
  );
}

export default CalendarPicker;
