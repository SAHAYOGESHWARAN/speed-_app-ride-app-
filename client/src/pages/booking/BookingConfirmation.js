import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './BookingStyles.css';

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state?.booking;

  useEffect(() => {
    if (!booking) {
      navigate('/new-booking');
    }
  }, [booking, navigate]);

  if (!booking) return null;

  return (
    <div className="confirmation-container">
      <div className="confirmation-card">
        <h2>🚖 Ride Booked Successfully!</h2>
        <div className="booking-summary">
          <div className="summary-item">
            <span className="label">Pickup Location:</span>
            <span className="value">{booking.pickupLocation}</span>
          </div>
          <div className="summary-item">
            <span className="label">Dropoff Location:</span>
            <span className="value">{booking.dropoffLocation}</span>
          </div>
          <div className="summary-item">
            <span className="label">Booking ID:</span>
            <span className="value">{booking._id}</span>
          </div>
          <div className="summary-item">
            <span className="label">Status:</span>
            <span className={`status ${booking.status}`}>{booking.status}</span>
          </div>
        </div>
        
        <div className="action-buttons">
          <button 
            onClick={() => navigate('/bookings')}
            className="btn-primary"
          >
            View Booking History
          </button>
          <button
            onClick={() => navigate('/new-booking')}
            className="btn-secondary"
          >
            Book Another Ride
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;