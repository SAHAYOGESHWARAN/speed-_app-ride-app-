import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import RideForm from '../../components/booking/RideForm';
import BookingConfirmation from '../../components/booking/BookingConfirmation';
import Loader from '../../components/common/Loader';
import ErrorMessage from '../../components/common/ErrorMessage';
import { calculateFare } from '../../utils/fareCalculator';
import { trackEvent } from '../../utils/analytics';
import './NewBooking.scss';

const NewBooking = () => {
  const { user } = useAuth();
  const { createBooking, clearDraft } = useBooking();
  const navigate = useNavigate();
  
  const [state, setState] = useState({
    booking: null,
    error: null,
    isLoading: false,
    isSubmitting: false,
    countdown: 5,
    showEdit: false
  });

  const handleFormSubmit = async (formData) => {
    try {
      setState(prev => ({ ...prev, isSubmitting: true, error: null }));
      
      const fare = await calculateFare(formData);
      const bookingData = {
        ...formData,
        user: user._id,
        estimatedFare: fare,
        paymentMethod: formData.paymentMethod || 'cash'
      };

      const newBooking = await createBooking(bookingData);
      
      trackEvent('booking_created', {
        category: 'Bookings',
        vehicle_type: formData.vehicleType
      });

      setState(prev => ({
        ...prev,
        booking: newBooking,
        isSubmitting: false,
        error: null
      }));

      startConfirmationCountdown();
      clearDraft();

    } catch (error) {
      trackEvent('booking_failed', { error: error.message });
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error || 'Booking creation failed',
        isSubmitting: false
      }));
    }
  };

  const startConfirmationCountdown = useCallback(() => {
    const timer = setInterval(() => {
      setState(prev => ({
        ...prev,
        countdown: prev.countdown > 0 ? prev.countdown - 1 : 0
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleEditBooking = () => {
    setState(prev => ({ ...prev, showEdit: true }));
  };

  const handleNavigateToBookings = () => {
    navigate('/bookings');
  };

  const handleCreateNewBooking = () => {
    setState({
      booking: null,
      error: null,
      isLoading: false,
      isSubmitting: false,
      countdown: 5,
      showEdit: false
    });
  };

  useEffect(() => {
    if (state.countdown === 0) {
      handleNavigateToBookings();
    }
  }, [state.countdown]);

  if (state.isLoading) return <Loader fullPage />;

  return (
    <div className="new-booking-container">
      <div className="booking-header">
        <h1>Book a New Ride</h1>
        <p className="subheader">
          {state.booking ? 'Booking Confirmation' : 'Enter your ride details'}
        </p>
      </div>

      {state.error && (
        <ErrorMessage 
          message={state.error}
          onRetry={() => setState(prev => ({ ...prev, error: null }))}
        />
      )}

      {state.booking && !state.showEdit ? (
        <BookingConfirmation 
          booking={state.booking}
          countdown={state.countdown}
          onEdit={handleEditBooking}
          onNewBooking={handleCreateNewBooking}
          onViewBookings={handleNavigateToBookings}
        />
      ) : (
        <div className="form-section">
          <RideForm
            onSubmit={handleFormSubmit}
            isSubmitting={state.isSubmitting}
            initialValues={state.booking}
          />
          <div className="form-footer">
            <button
              onClick={() => navigate('/bookings')}
              className="btn secondary"
              type="button"
            >
              View Previous Bookings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewBooking;