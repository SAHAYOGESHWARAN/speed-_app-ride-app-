const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User ',
    required: true
  },
  pickupLocation: {
    type: String,
    required: [true, 'Please provide a pickup location']
  },
  dropoffLocation: {
    type: String,
    required: [true, 'Please provide a dropoff location']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'canceled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', bookingSchema);