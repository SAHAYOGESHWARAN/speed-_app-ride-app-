const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const APIFeatures = require('../utils/apiFeatures');
const { AppError, ValidationError, NotFoundError } = require('../utils/errors');
const { asyncHandler } = require('../middleware/async');
const { userDTO } = require('../dtos/userDTO');
const logger = require('../utils/logger');
const { validateUserUpdate } = require('../validations/userValidation');
const userService = require('../services/userService');
const redisClient = require('../config/redis');
const { checkPermissions } = require('../utils/permissions');

// Cache timeout (1 hour)
const CACHE_EXPIRATION = 3600;

exports.getMe = asyncHandler(async (req, res) => {
  const cacheKey = `user:${req.user.id}`;
  let user = await redisClient.get(cacheKey);

  if (!user) {
    user = await userService.getUserById(req.user.id);
    if (!user) throw new NotFoundError('User not found');
    await redisClient.set(cacheKey, JSON.stringify(user), 'EX', CACHE_EXPIRATION);
  } else {
    user = JSON.parse(user);
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: userDTO(user)
  });
});

exports.updateMe = asyncHandler(async (req, res) => {
  // Validate input
  const { error } = validateUserUpdate(req.body);
  if (error) throw new ValidationError(error.details[0].message);

  // Prevent password updates through this route
  if (req.body.password) {
    throw new ValidationError('Password updates not allowed here');
  }

  // Handle file upload (example for avatar)
  if (req.file) {
    req.body.avatar = await userService.uploadAvatar(req.file);
  }

  const updatedUser = await userService.updateUser(
    req.user.id,
    req.body,
    { new: true, runValidators: true }
  );

  // Update cache
  const cacheKey = `user:${req.user.id}`;
  await redisClient.set(cacheKey, JSON.stringify(updatedUser), 'EX', CACHE_EXPIRATION);

  logger.info(`User updated: ${req.user.id}`);

  res.status(StatusCodes.OK).json({
    success: true,
    data: userDTO(updatedUser)
  });
});

exports.deleteMe = asyncHandler(async (req, res) => {
  await userService.deactivateUser(req.user.id);
  
  // Clear cache
  await redisClient.del(`user:${req.user.id}`);
  
  logger.warn(`User deactivated: ${req.user.id}`);
  
  res.status(StatusCodes.NO_CONTENT).send();
});

// Admin operations
exports.getAllUsers = asyncHandler(async (req, res) => {
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const [users, total] = await Promise.all([
    features.query,
    User.countDocuments(features.filter)
  ]);

  // Cache control
  res.set('Cache-Control', 'public, max-age=300');

  res.status(StatusCodes.OK).json({
    success: true,
    count: users.length,
    pagination: {
      total: total,
      page: features.query.page,
      limit: features.query.limit
    },
    data: users.map(user => userDTO(user))
  });
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  if (!user) throw new NotFoundError('User not found');
  
  checkPermissions(req.user, user);
  
  res.status(StatusCodes.OK).json({
    success: true,
    data: userDTO(user)
  });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  // Clear cache
  await redisClient.del(`user:${req.params.id}`);
  
  logger.info(`Admin updated user: ${req.params.id} by ${req.user.id}`);

  res.status(StatusCodes.OK).json({
    success: true,
    data: userDTO(user)
  });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);
  
  // Clear cache
  await redisClient.del(`user:${req.params.id}`);
  
  logger.warn(`User deleted: ${req.params.id} by admin ${req.user.id}`);

  res.status(StatusCodes.NO_CONTENT).send();
});