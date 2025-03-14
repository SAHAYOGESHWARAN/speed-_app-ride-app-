import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RideForm from '../../components/booking/RideForm';
import bookingService from '../../services/bookingService';
import './BookingStyles.css';

const NewBooking = () => {
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    try {
      const newBooking = await bookingService.createBooking({
        ...formData,
        user: user._id
      });
      setBooking(newBooking);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create booking');
    }
  };

  return (
    <div className="booking-container">
      <h2>New Ride Booking</h2>
      {error && <div className="error-message">{error}</div>}
      
      {booking ? (
        <div className="confirmation-card">
          <h3>🎉 Booking Confirmed!</h3>
          <div className="booking-details">
            <p><strong>Pickup:</strong> {booking.pickupLocation}</p>
            <p><strong>Dropoff:</strong> {booking.dropoffLocation}</p>
            <p><strong>Status:</strong> {booking.status}</p>
            <p><strong>Booking ID:</strong> {booking._id}</p>
          </div>
          <div className="action-buttons">
            <button onClick={() => navigate('/bookings')} className="btn-primary">
              View All Bookings
            </button>
            <button onClick={() => setBooking(null)} className="btn-secondary">
              Create New Booking
            </button>
          </div>
        </div>
      ) : (
        <RideForm onSubmit={handleSubmit} />
      )}
    </div>
  );
};

export default NewBooking;