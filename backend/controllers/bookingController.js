const { StatusCodes } = require('http-status-codes');
const APIFeatures = require('../utils/apiFeatures');
const Booking = require('../models/Booking');
const { asyncHandler } = require('../middleware/async');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const bookingService = require('../services/bookingService');
const logger = require('../utils/logger');
const { validateBookingInput } = require('../validations/bookingValidation');
const { bookingDTO } = require('../dtos/bookingDTO');

exports.createBooking = asyncHandler(async (req, res) => {
  // Validate input
  const { error } = validateBookingInput(req.body);
  if (error) throw new BadRequestError(error.details[0].message);

  // Check business rules
  await bookingService.validateBookingRules(req.user.id, req.body);

  // Create booking
  const booking = await bookingService.createBooking({
    user: req.user.id,
    ...req.body
  });

  // Log booking creation
  logger.info(`Booking created: ${booking._id} by user ${req.user.id}`);

  // Send response with DTO
  res.status(StatusCodes.CREATED).json({
    success: true,
    data: bookingDTO(booking)
  });
});

exports.getBookings = asyncHandler(async (req, res) => {
  // Build query
  const filter = { user: req.user.id };
  const features = new APIFeatures(Booking.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // Execute query
  const [bookings, total] = await Promise.all([
    features.query,
    Booking.countDocuments(filter)
  ]);

  // Pagination metadata
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 100;
  const totalPages = Math.ceil(total / limit);

  // Cache control
  res.set('Cache-Control', 'public, max-age=60, must-revalidate');

  res.status(StatusCodes.OK).json({
    success: true,
    count: bookings.length,
    pagination: {
      total,
      totalPages,
      page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    data: bookings.map(booking => bookingDTO(booking))
  });
});

exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.getUserBooking(
    req.params.id,
    req.user.id
  );

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: bookingDTO(booking)
  });
});

exports.updateBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.updateUserBooking(
    req.params.id,
    req.user.id,
    req.body
  );

  logger.info(`Booking updated: ${booking._id} by user ${req.user.id}`);

  res.status(StatusCodes.OK).json({
    success: true,
    data: bookingDTO(booking)
  });
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  await bookingService.cancelBooking(req.params.id, req.user.id);
  
  logger.info(`Booking canceled: ${req.params.id} by user ${req.user.id}`);
  
  res.status(StatusCodes.NO_CONTENT).send();
});