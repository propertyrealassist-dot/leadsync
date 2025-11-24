import React from 'react';
import './Calendar.css';

function Calendar() {
  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <div className="header-content">
          <div className="header-icon">📅</div>
          <div className="header-text">
            <h1>Calendar</h1>
            <p>Schedule and manage your appointments</p>
          </div>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-icon">🚧</div>
        <h2>Coming Soon</h2>
        <p>We're working hard to bring you calendar functionality. Check back soon!</p>
      </div>
    </div>
  );
}

export default Calendar;
