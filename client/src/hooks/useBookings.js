import { useState, useEffect } from 'react';
import bookingService from '../services/bookingService';

const useBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
 const data = await bookingService.getBookings();
        setBookings(data);
      } catch (error) {
        setError('Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  return { bookings, loading, error };
};

export default useBookings;