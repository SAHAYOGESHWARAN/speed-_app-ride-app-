const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const auth = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validation');
const { 
  createBookingSchema,
  updateBookingSchema 
} = require('../validations/bookingSchemas');
const { setUserTimeZone } = require('../middleware/timezone');
const { checkResourceOwnership } = require('../middleware/ownership');
const Booking = require('../models/Booking');

// Public routes
router.get('/available-slots', 
  rateLimiter(60, 15), // 60 requests per 15 minutes
  bookingController.getAvailableSlots
);

// Protected routes
router.use(auth.protect);

// Geolocation-based bookings
router.get('/nearby', 
  rateLimiter(30, 15),
  bookingController.getNearbyBookings
);

// User-specific bookings
router.get('/my-bookings',
  rateLimiter(30, 15),
  setUserTimeZone,
  bookingController.getUserBookings
);

// CRUD operations with validation and ownership checks
router.post('/',
  rateLimiter(5, 60), // 5 bookings per hour
  validate(createBookingSchema),
  bookingController.checkConflict,
  bookingController.createBooking
);

router.get('/:id',
  rateLimiter(30, 15),
  checkResourceOwnership(Booking, 'user'),
  bookingController.getBooking
);

router.patch('/:id',
  rateLimiter(10, 15),
  checkResourceOwnership(Booking, 'user'),
  validate(updateBookingSchema),
  bookingController.updateBooking
);

router.delete('/:id',
  checkResourceOwnership(Booking, 'user'),
  bookingController.deleteBooking
);

// Admin-only routes
router.use(auth.restrictTo('admin', 'support'));

router.get('/',
  rateLimiter(60, 15),
  bookingController.getAllBookings
);

router.get('/stats/monthly',
  rateLimiter(30, 15),
  bookingController.getMonthlyStats
);

router.post('/:id/confirm-payment',
  rateLimiter(20, 15),
  bookingController.confirmPayment
);

// Webhook endpoint for payment providers
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  bookingController.handlePaymentWebhook
);

// Recurring bookings
router.post('/:id/clone',
  rateLimiter(5, 60),
  bookingController.cloneBooking
);

module.exports = router;