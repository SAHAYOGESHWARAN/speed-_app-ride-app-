import { motion } from 'framer-motion';
import { ClockIcon, MapPinIcon, CurrencyDollarIcon, UserIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import RideStatus from './RideStatus';
import Avatar from './Avatar';

const RideCard = ({ ride, compact }) => {
  const navigate = useNavigate();
  
  // Animation variants
  const cardVariants = {
    hover: { y: -2, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
    tap: { scale: 0.98 }
  };

  const handleViewDetails = () => {
    navigate(`/rides/${ride.id}`);
  };

  return (
    <motion.div
      variants={cardVariants}
      whileHover="hover"
      whileTap="tap"
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${
        compact ? 'p-4' : 'p-6'
      } transition-colors hover:border-gray-200 cursor-pointer`}
      onClick={handleViewDetails}
      role="button"
      aria-label={`View details for ride from ${ride.pickupLocation} to ${ride.dropoffLocation}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <RideStatus status={ride.status} />
            {ride.driver && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <UserIcon className="h-4 w-4" />
                <span>{ride.driver.name}</span>
                <Avatar src={ride.driver.avatar} size="xs" />
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="flex flex-col items-center pt-1">
              <MapPinIcon className="h-5 w-5 text-green-500" />
              <div className="w-px h-8 bg-gray-200 my-1" />
              <MapPinIcon className="h-5 w-5 text-red-500" />
            </div>
            
            <div className="flex-1">
              <p className="font-medium text-gray-900">{ride.pickupLocation}</p>
              <div className="my-1">
                <ArrowsRightLeftIcon className="h-4 w-4 text-gray-400" />
              </div>
              <p className="font-medium text-gray-900">{ride.dropoffLocation}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              <span>{format(parseISO(ride.scheduledTime), 'MMM dd, h:mm a')}</span>
            </div>
            
            {ride.vehicleType && (
              <div className="flex items-center gap-1">
                <span className="text-xs uppercase bg-gray-100 px-2 py-1 rounded">
                  {ride.vehicleType}
                </span>
              </div>
            )}
            
            {ride.fare && (
              <div className="flex items-center gap-1">
                <CurrencyDollarIcon className="h-4 w-4" />
                <span className="font-medium text-gray-900">
                  {ride.fare.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {!compact && ride.distance && (
          <div className="text-center px-4 py-2 bg-indigo-50 rounded-lg">
            <p className="text-2xl font-bold text-indigo-600">
              {ride.distance.toFixed(1)}
            </p>
            <p className="text-xs text-indigo-500">miles</p>
          </div>
        )}
      </div>

      {ride.sharedRide && (
        <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
              Shared Ride
            </span>
            {ride.copassengers?.map(p => p.name).join(', ')}
          </p>
        </div>
      )}
    </motion.div>
  );
};

RideCard.propTypes = {
  ride: PropTypes.shape({
    id: PropTypes.string.isRequired,
    pickupLocation: PropTypes.string.isRequired,
    dropoffLocation: PropTypes.string.isRequired,
    scheduledTime: PropTypes.string.isRequired,
    status: PropTypes.oneOf(['pending', 'confirmed', 'in-progress', 'completed', 'cancelled']),
    vehicleType: PropTypes.string,
    fare: PropTypes.number,
    distance: PropTypes.number,
    driver: PropTypes.shape({
      name: PropTypes.string,
      avatar: PropTypes.string
    }),
    sharedRide: PropTypes.bool,
    copassengers: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string
      })
    )
  }).isRequired,
  compact: PropTypes.bool
};

RideCard.defaultProps = {
  compact: false
};

export default RideCard;