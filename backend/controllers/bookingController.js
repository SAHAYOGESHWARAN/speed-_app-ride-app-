const Booking = require('../models/Booking');
const { StatusCodes } = require('http-status-codes');
const APIFeatures = require('../utils/apiFeatures');

exports.createBooking = async (req, res) => {
  try {
    const booking = await Booking.create({
      user: req.user.id,
      ...req.body
    });

    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: {
        booking
      }
    });
  } catch (err) {
    res.status(StatusCodes.BAD_REQUEST).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const features = new APIFeatures(Booking.find({ user: req.user.id }), req.query)
      .filter()
      .sort()
      .paginate();

    const bookings = await features.query;

    res.status(StatusCodes.OK).json({
      status: 'success',
      results: bookings.length,
      data: {
        bookings
      }
    });
  } catch (err) {
    res.status(StatusCodes.BAD_REQUEST).json({
      status: 'error',
      message: err.message
    });
  }
};