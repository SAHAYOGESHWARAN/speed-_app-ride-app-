const mongoose = require('mongoose');
const geocoder = require('../utils/geocoder');
const { calculatePrice } = require('../utils/pricing');
const { sendBookingConfirmation } = require('../services/notificationService');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    index: true
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'car', 'premium'],
    required: [true, 'Vehicle type is required'],
    default: 'bike'
  },
  pickupLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords) => 
          coords.length === 2 && 
          coords[0] >= -180 && coords[0] <= 180 &&
          coords[1] >= -90 && coords[1] <= 90,
        message: 'Invalid coordinates format'
      }
    },
    address: String,
    instructions: String
  },
  dropoffLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords) => 
          coords.length === 2 && 
          coords[0] >= -180 && coords[0] <= 180 &&
          coords[1] >= -90 && coords[1] <= 90,
        message: 'Invalid coordinates format'
      }
    },
    address: String
  },
  distance: {
    type: Number,
    min: [0.1, 'Distance must be at least 0.1 km'],
    required: true
  },
  price: {
    type: Number,
    min: [0, 'Price must be a positive number'],
    required: true
  },
  scheduledTime: {
    type: Date,
    validate: {
      validator: (date) => date > Date.now(),
      message: 'Scheduled time must be in the future'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'in_progress', 'completed', 'canceled'],
      message: 'Invalid booking status'
    },
    default: 'pending'
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'wallet']
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    },
    transactionId: String
  },
  cancellation: {
    reason: String,
    initiatedBy: {
      type: String,
      enum: ['user', 'driver', 'system']
    },
    timestamp: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geocode pickup/dropoff addresses before saving
bookingSchema.pre('save', async function(next) {
  if (this.isModified('pickupLocation.address')) {
    const loc = await geocoder.geocode(this.pickupLocation.address);
    this.pickupLocation.coordinates = [loc[0].longitude, loc[0].latitude];
  }
  
  if (this.isModified('dropoffLocation.address')) {
    const loc = await geocoder.geocode(this.dropoffLocation.address);
    this.dropoffLocation.coordinates = [loc[0].longitude, loc[0].latitude];
  }
  
  if (this.isModified('distance') || this.isModified('vehicleType')) {
    this.price = calculatePrice(this.distance, this.vehicleType);
  }
  
  next();
});

// Send confirmation after booking creation
bookingSchema.post('save', async function(doc) {
  if (doc.status === 'confirmed') {
    await sendBookingConfirmation(doc.user, doc);
  }
});

// Indexes
bookingSchema.index({ pickupLocation: '2dsphere' });
bookingSchema.index({ dropoffLocation: '2dsphere' });
bookingSchema.index({ status: 1, createdAt: -1 });

// Virtuals
bookingSchema.virtual('duration').get(function() {
  return this.distance * 3; // Average 3 minutes per km
});

// Query Helpers
bookingSchema.query.byUser = function(userId) {
  return this.where({ user: userId });
};

bookingSchema.query.active = function() {
  return this.where({ status: { $in: ['pending', 'confirmed', 'in_progress'] } });
};

// Instance Methods
bookingSchema.methods.cancel = async function(reason, initiatedBy) {
  this.status = 'canceled';
  this.cancellation = { reason, initiatedBy, timestamp: Date.now() };
  return this.save();
};

bookingSchema.methods.toJSON = function() {
  const booking = this.toObject();
  delete booking.__v;
  delete booking.updatedAt;
  return booking;
};

// Static Methods
bookingSchema.statics.findByLocation = function(coordinates, maxDistance = 5000) {
  return this.find({
    'pickupLocation.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: maxDistance
      }
    },
    status: 'pending'
  });
};

module.exports = mongoose.model('Booking', bookingSchema);