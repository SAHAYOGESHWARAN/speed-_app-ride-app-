import { useState, useEffect, useCallback, useRef } from 'react';
import bookingService from '../services/bookingService';
import { useErrorHandler } from '../context/ErrorContext';
import { useAuth } from '../context/AuthContext';

const useBookings = (options = {}) => {
  const { page: initialPage = 1, limit: initialLimit = 10, sort: initialSort = '-createdAt', filter: initialFilter = {} } = options;
  const [state, setState] = useState({
    bookings: [],
    meta: { page: initialPage, limit: initialLimit, total: 0, totalPages: 1 },
    loading: true,
    error: null,
    mutating: false
  });
  const abortController = useRef(new AbortController());
  const { user } = useAuth();
  const handleError = useErrorHandler();
  const cache = useRef({});

  const generateCacheKey = useCallback(() => {
    return `bookings-${user?.id}-${initialPage}-${initialLimit}-${JSON.stringify(initialSort)}-${JSON.stringify(initialFilter)}`;
  }, [user?.id, initialPage, initialLimit, initialSort, initialFilter]);

  const fetchBookings = useCallback(async (params = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const mergedParams = {
        page: initialPage,
        limit: initialLimit,
        sort: initialSort,
        filter: initialFilter,
        ...params
      };

      const cacheKey = generateCacheKey();
      if (cache.current[cacheKey] && !params.forceRefresh) {
        return setState({
          bookings: cache.current[cacheKey].data,
          meta: cache.current[cacheKey].meta,
          loading: false,
          error: null,
          mutating: false
        });
      }

      const { data, meta } = await bookingService.getBookings({
        signal: abortController.current.signal,
        ...mergedParams
      });

      cache.current[cacheKey] = { data, meta };
      setState({
        bookings: data,
        meta,
        loading: false,
        error: null,
        mutating: false
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        setState(prev => ({ ...prev, loading: false, error: handleError(error) }));
      }
    }
  }, [initialPage, initialLimit, initialSort, initialFilter, generateCacheKey, handleError]);

  const refresh = useCallback(() => {
    cache.current = {};
    fetchBookings({ forceRefresh: true });
  }, [fetchBookings]);

  const createBooking = useCallback(async (bookingData) => {
    try {
      setState(prev => ({ ...prev, mutating: true }));
      const newBooking = await bookingService.createBooking(bookingData);
      setState(prev => ({
        ...prev,
        bookings: [newBooking, ...prev.bookings],
        mutating: false
      }));
      return newBooking;
    } catch (error) {
      setState(prev => ({ ...prev, mutating: false }));
      throw handleError(error);
    }
  }, [handleError]);

  const cancelBooking = useCallback(async (bookingId) => {
    try {
      setState(prev => ({
        ...prev,
        bookings: prev.bookings.filter(b => b.id !== bookingId),
        mutating: true
      }));
      
      await bookingService.cancelBooking(bookingId);
      refresh();
    } catch (error) {
      refresh();
      throw handleError(error);
    }
  }, [refresh, handleError]);

  // Real-time updates with WebSocket
  useEffect(() => {
    if (!user?.id) return;

    const ws = new WebSocket(process.env.REACT_APP_WS_URL);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'bookingUpdate') {
        setState(prev => ({
          ...prev,
          bookings: prev.bookings.map(b => 
            b.id === message.data.id ? { ...b, ...message.data } : b
          )
        }));
      }
    };

    return () => ws.close();
  }, [user?.id]);

  // Pagination controls
  const goToPage = useCallback((page) => {
    fetchBookings({ page });
  }, [fetchBookings]);

  useEffect(() => {
    fetchBookings();
    return () => abortController.current.abort();
  }, [fetchBookings]);

  return {
    ...state,
    fetchBookings,
    createBooking,
    cancelBooking,
    refresh,
    goToPage,
    hasNextPage: state.meta.page < state.meta.totalPages,
    hasPrevPage: state.meta.page > 1
  };
};

export default useBookings;