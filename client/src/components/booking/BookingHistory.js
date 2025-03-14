import useBookings from '../../hooks/useBookings';

const BookingHistory = () => {
  const { bookings, loading, error } = useBookings();

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Your Bookings</h2>
      <ul>
        {bookings.map((booking) => (
          <li key={booking._id}>
            {booking.pickupLocation} to {booking.dropoffLocation}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BookingHistory;