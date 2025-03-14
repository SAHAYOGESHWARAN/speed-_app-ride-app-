import API from './api';

export default {
  createBooking: async (bookingData) => {
    const { data } = await API.post('/bookings', bookingData);
    return data;
  },
  getBookings: async () => {
    const { data } = await API.get('/bookings');
    return data;
  },
  cancelBooking: async (id) => {
    await API.delete(`/bookings/${id}`);
  },
};