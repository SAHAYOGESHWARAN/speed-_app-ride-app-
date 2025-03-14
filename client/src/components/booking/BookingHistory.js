import { useState } from 'react';
import { useBookings } from '../../hooks/useBookings';
import BookingStatusBadge from '../common/BookingStatusBadge';
import SkeletonLoader from '../common/SkeletonLoader';
import ErrorMessage from '../common/ErrorMessage';
import EmptyState from '../common/EmptyState';
import Pagination from '../common/Pagination';
import { format, parseISO } from 'date-fns';
import { ArrowPathIcon, EyeIcon } from '@heroicons/react/24/outline';

const BookingHistory = () => {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('-createdAt');
  const [statusFilter, setStatusFilter] = useState('all');
  const { 
    bookings, 
    loading, 
    error, 
    totalPages,
    refreshBookings 
  } = useBookings(page, 10, sort, statusFilter);

  const handleSortChange = (newSort) => {
    setSort(newSort);
    setPage(1);
  };

  const handleStatusFilter = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  if (loading && !bookings.length) {
    return <SkeletonLoader count={5} />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error}
        onRetry={refreshBookings}
      />
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Booking History</h1>
          <p className="mt-2 text-sm text-gray-700">
            View all your past and upcoming bookings
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-4">
          <button
            onClick={refreshBookings}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </button>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="-createdAt">Newest First</option>
            <option value="createdAt">Oldest First</option>
            <option value="-scheduledTime">Upcoming First</option>
          </select>
        </div>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings found"
          description="You don't have any bookings yet. Start by creating a new booking."
          actionText="New Booking"
          actionHref="/bookings/new"
        />
      ) : (
        <>
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {format(parseISO(booking.scheduledTime), 'MMM dd, yyyy')}
                        </span>
                        <span className="text-gray-400">
                          {format(parseISO(booking.scheduledTime), 'hh:mm a')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">{booking.pickupLocation}</span>
                        <span className="text-gray-500">to</span>
                        <span className="font-medium">{booking.dropoffLocation}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {booking.vehicleType?.toUpperCase()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        onClick={() => navigate(`/bookings/${booking._id}`)}
                      >
                        <EyeIcon className="h-5 w-5 mr-1" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BookingHistory;