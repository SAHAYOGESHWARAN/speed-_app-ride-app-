import API, { createCancelToken, API_ERRORS } from './api';
import { encryptPayload } from './cryptoUtils';
import { trackEvent, logError } from './analytics';
import { bookingSchema, updateBookingSchema } from './validationSchemas';
import { normalizeBooking } from './normalizers';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache = {
  bookings: {
    data: null,
    timestamp: 0,
    cancelToken: null
  }
};

const BookingService = {
  createBooking: async (bookingData) => {
    try {
      const source = createCancelToken();
      const encryptedData = encryptPayload(bookingData);
      
      const { data } = await API.post('/bookings', {
        ...encryptedData,
        _fingerprint: generateRequestFingerprint()
      }, {
        cancelToken: source.token,
        headers: {
          'X-Idempotency-Key': generateIdempotencyKey()
        }
      });

      trackEvent('booking_created', { type: bookingData.type });
      updateCache(data);
      return normalizeBooking(data);
    } catch (error) {
      logError('Booking creation failed', error);
      throw handleBookingError(error);
    }
  },

  getBookings: async (params = {}) => {
    try {
      const { page = 1, limit = 10, sort = '-createdAt', filter = {} } = params;
      const cacheKey = JSON.stringify({ page, limit, sort, filter });

      // Check cache first
      if (cache.bookings.data && Date.now() - cache.bookings.timestamp < CACHE_TTL) {
        return cache.bookings.data;
      }

      const source = createCancelToken();
      if (cache.bookings.cancelToken) {
        cache.bookings.cancelToken.cancel('New request initiated');
      }

      const { data } = await API.get('/bookings', {
        params: { page, limit, sort, filter },
        cancelToken: source.token
      });

      const normalizedData = {
        ...data,
        results: data.results.map(normalizeBooking)
      };

      cache.bookings = {
        data: normalizedData,
        timestamp: Date.now(),
        cancelToken: source
      };

      return normalizedData;
    } catch (error) {
      if (!axios.isCancel(error)) {
        logError('Failed to fetch bookings', error);
      }
      throw handleBookingError(error);
    }
  },

  cancelBooking: async (id, reason) => {
    try {
      const source = createCancelToken();
      await API.delete(`/bookings/${id}`, {
        data: { reason },
        cancelToken: source.token
      });

      trackEvent('booking_canceled', { bookingId: id });
      invalidateCache();
      return true;
    } catch (error) {
      logError('Booking cancellation failed', error);
      throw handleBookingError(error);
    }
  },

  updateBooking: async (id, updateData) => {
    try {
      const source = createCancelToken();
      const { data } = await API.patch(`/bookings/${id}`, updateData, {
        cancelToken: source.token,
        headers: {
          'X-Idempotency-Key': generateIdempotencyKey()
        }
      });

      trackEvent('booking_updated', { bookingId: id });
      updateCache(data);
      return normalizeBooking(data);
    } catch (error) {
      logError('Booking update failed', error);
      throw handleBookingError(error);
    }
  },

  getBookingById: async (id) => {
    try {
      const source = createCancelToken();
      const { data } = await API.get(`/bookings/${id}`, {
        cancelToken: source.token
      });
      return normalizeBooking(data);
    } catch (error) {
      logError('Failed to fetch booking', error);
      throw handleBookingError(error);
    }
  },

  availabilityCheck: async (params) => {
    try {
      const source = createCancelToken();
      const { data } = await API.post('/bookings/availability', params, {
        cancelToken: source.token
      });
      return data;
    } catch (error) {
      logError('Availability check failed', error);
      throw handleBookingError(error);
    }
  },

  subscribeToUpdates: (bookingId, callback) => {
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/bookings/${bookingId}`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      callback(normalizeBooking(update));
    };

    return () => ws.close();
  }
};

// Helper functions
const generateIdempotencyKey = () => {
  return `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateRequestFingerprint = () => {
  return btoa(JSON.stringify({
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language
  }));
};

const handleBookingError = (error) => {
  const normalizedError = {
    code: error.code || API_ERRORS.UNKNOWN_ERROR,
    message: error.message || 'Booking operation failed',
    status: error.status,
    retryable: isRetryableError(error.code),
    details: error.details || {}
  };

  if (error.response?.data?.validationErrors) {
    normalizedError.validationErrors = error.response.data.validationErrors;
  }

  return normalizedError;
};

const isRetryableError = (code) => {
  return [
    API_ERRORS.NETWORK_ERROR,
    API_ERRORS.TIMEOUT_ERROR,
    API_ERRORS.SERVER_ERROR
  ].includes(code);
};

const updateCache = (newBooking) => {
  if (cache.bookings.data) {
    cache.bookings.data.results = [
      newBooking,
      ...cache.bookings.data.results.filter(b => b.id !== newBooking.id)
    ];
  }
};

const invalidateCache = () => {
  cache.bookings = {
    data: null,
    timestamp: 0,
    cancelToken: null
  };
};

export default BookingService;