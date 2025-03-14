import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBooking } from '../context/BookingContext';
import { sendConfirmationEmail } from '../services/emailService';
import { formatCurrency, formatDateTime } from '../utils/formatting';
import QRCode from 'react-qr-code';
import Spinner from './Spinner';
import './BookingConfirmation.css';

const BookingConfirmation = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { getBooking } = useBooking();
  const [booking, setBooking] = useState(location.state?.booking);
  const [isLoading, setIsLoading] = useState(!location.state?.booking);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const data = await getBooking(bookingId);
        setBooking(data);
      } catch (error) {
        navigate('/error', { state: { message: 'Booking not found' } });
      } finally {
        setIsLoading(false);
      }
    };

    if (!booking) fetchBooking();
  }, [bookingId, getBooking, navigate, booking]);

  useEffect(() => {
    if (!booking) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [booking]);

  const handleResendConfirmation = async () => {
    setIsSendingEmail(true);
    try {
      await sendConfirmationEmail(booking._id);
      // Show success notification
    } catch (error) {
      // Handle error
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCancelBooking = () => {
    navigate(`/bookings/${booking._id}/cancel`);
  };

  if (isLoading) return <Spinner fullPage />;
  if (!booking) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="confirmation-container"
    >
      <div className="confirmation-card">
        <div className="confirmation-header">
          <h1>🎉 Ride Booked Successfully!</h1>
          <div className="booking-id">Booking ID: {booking._id}</div>
        </div>

        <div className="booking-details-grid">
          <div className="detail-card">
            <h3>Route Details</h3>
            <div className="detail-item">
              <span className="label">Pickup:</span>
              <span className="value">{booking.pickupLocation}</span>
            </div>
            <div className="detail-item">
              <span className="label">Dropoff:</span>
              <span className="value">{booking.dropoffLocation}</span>
            </div>
            <div className="map-preview">
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?size=600x300&path=weight:3|color:blue|${booking.pickupCoords}|${booking.dropoffCoords}&key=YOUR_MAP_KEY`}
                alt="Route preview"
              />
            </div>
          </div>

          <div className="detail-card">
            <h3>Trip Information</h3>
            <div className="detail-item">
              <span className="label">Date & Time:</span>
              <span className="value">{formatDateTime(booking.scheduledTime)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Vehicle Type:</span>
              <span className="value">{booking.vehicleType}</span>
            </div>
            <div className="detail-item">
              <span className="label">Estimated Fare:</span>
              <span className="value">{formatCurrency(booking.estimatedFare)}</span>
            </div>
          </div>

          <div className="detail-card status-card">
            <div className="status-indicator">
              <span className={`status-badge ${booking.status}`}>
                {booking.status}
              </span>
              {timeLeft > 0 && (
                <div className="cancel-timer">
                  <span className="timer-text">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="timer-label">to cancel</span>
                </div>
              )}
            </div>
            <div className="qr-code">
              <QRCode value={booking._id} size={128} />
              <p className="qr-instruction">Show this code to your driver</p>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            onClick={() => navigate('/bookings')}
            className="btn primary"
            aria-label="View booking history"
          >
            View Booking History
          </button>
          <button
            onClick={() => navigate('/new-booking')}
            className="btn secondary"
            aria-label="Book another ride"
          >
            Book Another Ride
          </button>
          {timeLeft > 0 && (
            <button
              onClick={handleCancelBooking}
              className="btn warning"
              aria-label="Cancel booking"
            >
              Cancel Booking
            </button>
          )}
          <button
            onClick={handleResendConfirmation}
            className="btn text"
            disabled={isSendingEmail}
          >
            {isSendingEmail ? 'Sending...' : 'Resend Confirmation'}
          </button>
          <button
            onClick={() => window.print()}
            className="btn text"
            aria-label="Print confirmation"
          >
            Print Confirmation
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BookingConfirmation;