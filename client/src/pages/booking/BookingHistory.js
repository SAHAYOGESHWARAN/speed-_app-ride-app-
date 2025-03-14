import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookings } from '../../hooks/useBookings';
import { formatDate, formatCurrency } from '../../utils/formatters';
import Pagination from '../../components/common/Pagination';
import FilterControls from '../../components/common/FilterControls';
import BookingStatusBadge from '../../components/common/BookingStatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import './BookingHistory.scss';

const BookingHistory = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('-createdAt');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    bookings,
    totalPages,
    isLoading,
    error,
    refreshBookings,
    cancelBooking
  } = useBookings(currentPage, 10, sortBy, statusFilter, searchQuery);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSortChange = (sortValue) => {
    setSortBy(sortValue);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading && currentPage === 1) return <Loader fullPage />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="booking-history"
    >
      <div className="header-section">
        <h1>Your Ride History</h1>
        <div className="controls">
          <FilterControls
            onSearch={handleSearch}
            onFilterChange={handleStatusFilter}
            onSortChange={handleSortChange}
            filterOptions={[
              { value: 'all', label: 'All Statuses' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
            sortOptions={[
              { value: '-createdAt', label: 'Newest First' },
              { value: 'createdAt', label: 'Oldest First' },
              { value: '-date', label: 'Ride Date' }
            ]}
          />
          <button
            onClick={refreshBookings}
            className="refresh-button"
            aria-label="Refresh bookings"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error} <button onClick={refreshBookings}>Retry</button>
        </div>
      )}

      <div className="booking-list-container">
        <AnimatePresence initial={false}>
          {bookings.length === 0 ? (
            <EmptyState
              title="No bookings found"
              message="You haven't made any bookings yet"
              action={
                <Link to="/new-booking" className="cta-button">
                  Book Your First Ride
                </Link>
              }
            />
          ) : (
            <>
              <div className="booking-list-header">
                <span>Ride Details</span>
                <span>Status</span>
                <span>Date</span>
                <span>Amount</span>
                <span>Actions</span>
              </div>

              <div className="booking-list">
                <AnimatePresence initial={false}>
                  {bookings.map((booking) => (
                    <motion.div
                      key={booking._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="booking-card"
                    >
                      <div className="ride-details">
                        <div className="locations">
                          <span className="from">
                            🚩 {booking.pickupLocation}
                          </span>
                          <span className="to">
                            🏁 {booking.dropoffLocation}
                          </span>
                        </div>
                        <div className="vehicle-type">
                          {booking.vehicleType?.toUpperCase()}
                        </div>
                      </div>

                      <div className="status">
                        <BookingStatusBadge status={booking.status} />
                      </div>

                      <div className="date">
                        {formatDate(booking.scheduledTime)}
                      </div>

                      <div className="amount">
                        {formatCurrency(booking.finalAmount)}
                      </div>

                      <div className="actions">
                        <Link
                          to={`/bookings/${booking._id}`}
                          className="detail-button"
                          aria-label={`View details of booking ${booking._id}`}
                        >
                          View
                        </Link>
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => cancelBooking(booking._id)}
                            className="cancel-button"
                            aria-label={`Cancel booking ${booking._id}`}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </motion.div>
  );
};

export default BookingHistory;