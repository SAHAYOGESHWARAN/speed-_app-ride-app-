import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import bookingService from '../../services/bookingService';
import Loader from '../../components/common/Loader';
import './BookingStyles.css';

const BookingHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await bookingService.getBookings();
        setBookings(data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="booking-container">
      <h2>Your Ride History</h2>
      {error && <div className="error-message">{error}</div>}
      
      <div className="booking-list">
        {bookings.length === 0 ? (
          <div className="empty-state">
            <p>No bookings found</p>
            <Link to="/new-booking" className="btn-primary">
              Book a Ride Now
            </Link>
          </div>
        ) : (
          bookings.map((booking) => (
            <div key={booking._id} className="booking-card">
              <div className="booking-info">
                <h4>Booking #{booking._id.slice(-6)}</h4>
                <p><strong>From:</strong> {booking.pickupLocation}</p>
                <p><strong>To:</strong> {booking.dropoffLocation}</p>
                <p className={`status ${booking.status}`}>{booking.status}</p>
              </div>
              <div className="booking-meta">
                <p>{new Date(booking.createdAt).toLocaleDateString()}</p>
                <Link to={`/bookings/${booking._id}`} className="btn-secondary">
                  View Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookingHistory;