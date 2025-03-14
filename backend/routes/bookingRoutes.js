const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const auth = require('../middleware/auth');

router
  .route('/')
  .get(auth.protect, bookingController.getBookings)
  .post(auth.protect, bookingController.createBooking);

router
  .route('/:id')
  .get(auth.protect, bookingController.getBooking)
  .patch(auth.protect, bookingController.updateBooking)
  .delete(auth.protect, bookingController.deleteBooking);

module.exports = router;