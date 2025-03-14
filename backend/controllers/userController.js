const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -__v');
  
  res.status(StatusCodes.OK).json({
    status: 'success',
    data: {
      user
    }
  });
};

exports.updateMe = async (req, res) => {
  // 1) Create error if user POSTs password data
  if (req.body.password) {
    throw new AppError(
      'This route is not for password updates. Please use /updatepassword',
      StatusCodes.BAD_REQUEST
    );
  }

  // 2) Filtered out unwanted fields
  const filteredBody = {
    name: req.body.name,
    email: req.body.email
  };

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    { new: true, runValidators: true }
  ).select('-password -__v');

  res.status(StatusCodes.OK).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
};

exports.deleteMe = async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(StatusCodes.NO_CONTENT).json({
    status: 'success',
    data: null
  });
};

// Admin-only functions
exports.getAllUsers = async (req, res) => {
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .paginate();
  
  const users = await features.query.select('-password -__v');

  res.status(StatusCodes.OK).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
};

exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -__v');

  if (!user) {
    throw new AppError('No user found with that ID', StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.OK).json({
    status: 'success',
    data: {
      user
    }
  });
};

exports.updateUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).select('-password -__v');

  if (!user) {
    throw new AppError('No user found with that ID', StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.OK).json({
    status: 'success',
    data: {
      user
    }
  });
};

exports.deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    throw new AppError('No user found with that ID', StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.NO_CONTENT).json({
    status: 'success',
    data: null
  });
};