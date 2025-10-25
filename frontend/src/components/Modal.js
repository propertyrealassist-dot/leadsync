import React, { useEffect } from 'react';
import './Modal.css';

function Modal({ isOpen, title, message, onConfirm, onCancel, onThird, confirmText = 'Confirm', cancelText = 'Cancel', thirdText = 'Cancel', type = 'confirm' }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && onCancel) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('modal-overlay') && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          {onCancel && (
            <button
              className="modal-close"
              onClick={onCancel}
              aria-label="Close modal"
            >
              ×
            </button>
          )}
        </div>

        <div className="modal-body">
          <p>{message}</p>
        </div>

        <div className="modal-footer">
          {onCancel && (
            <button
              className="modal-btn modal-btn-secondary"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}
          {onThird && (
            <button
              className="modal-btn modal-btn-tertiary"
              onClick={onThird}
            >
              {thirdText}
            </button>
          )}
          {onConfirm && (
            <button
              className="modal-btn modal-btn-primary"
              onClick={onConfirm}
              autoFocus
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
