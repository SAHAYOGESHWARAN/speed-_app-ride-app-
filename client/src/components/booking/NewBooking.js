import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import RideForm from '../../components/booking/RideForm';
import bookingService from '../../services/bookingService';

const NewBooking = () => {
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (data) => {
    try {
      const newBooking = await bookingService.createBooking({
        ...data,
        userId: user._id
      });
      setBooking(newBooking);
    } catch (error) {
      setError('Failed to create booking');
    }
  };

  return (
    <div className="booking-container">
      <h2>New Booking</h2>
      {error && <div className="error">{error}</div>}
      {booking ? (
        <div className="confirmation">
          <h3>Booking Confirmed!</h3>
          <p>Pickup: {booking.pickupLocation}</p>
          <p>Dropoff: {booking.dropoffLocation}</p>
        </div>
      ) : (
        <RideForm onSubmit={handleSubmit} />
      )}
    </div>
  );
};

export default NewBooking;