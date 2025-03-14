const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const geocoder = require('../utils/geocoder');
const { roles, permissions } = require('../config/roles');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter your name'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Please enter your email'],
    unique: true,
    validate: {
      validator: (v) => validator.isEmail(v) && !v.endsWith('.ru'),
      message: 'Invalid email or restricted domain'
    },
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: [true, 'Please enter a password'],
    minlength: [12, 'Password must be at least 12 characters'],
    select: false,
    validate: {
      validator: (v) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/.test(v),
      message: 'Password must contain uppercase, lowercase, number, and special character'
    }
  },
  role: {
    type: String,
    enum: Object.values(roles),
    default: roles.USER
  },
  permissions: [{
    type: String,
    enum: Object.values(permissions)
  }],
  phone: {
    type: String,
    validate: {
      validator: (v) => validator.isMobilePhone(v, 'any'),
      message: 'Invalid phone number'
    }
  },
  avatar: String,
  address: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    },
    formattedAddress: String
  },
  social: {
    googleId: String,
    facebookId: String,
    githubId: String
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  mfa: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: String,
    backupCodes: [String]
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  lastLogin: {
    ip: String,
    timestamp: Date,
    userAgent: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'address.coordinates': '2dsphere' });

// Virtuals
userSchema.virtual('isLocked').get(function() {
  return this.lockUntil && this.lockUntil > Date.now();
});

// Pre-save hooks
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre('save', async function(next) {
  if (this.isModified('address') && this.address.formattedAddress) {
    const loc = await geocoder.geocode(this.address.formattedAddress);
    this.address.coordinates = [loc[0].longitude, loc[0].latitude];
  }
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.isLocked) throw new Error('Account is temporarily locked');
  
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  
  if (!isMatch) {
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) {
      this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
    }
    await this.save();
    return false;
  }

  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
  return true;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

userSchema.methods.generateMfaSecret = function() {
  this.mfa.secret = crypto.randomBytes(20).toString('hex');
  this.mfa.backupCodes = Array.from({ length: 5 }, () => 
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
  return this.mfa.secret;
};

userSchema.methods.hasPermission = function(requiredPermission) {
  return this.permissions.includes(requiredPermission) || 
         this.role === roles.ADMIN;
};

// Query helpers
userSchema.query.activeUsers = function() {
  return this.where({ active: true });
};

userSchema.query.byRole = function(role) {
  return this.where({ role });
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email }).select('+password +loginAttempts +lockUntil');
};

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.loginAttempts;
  delete user.lockUntil;
  delete user.mfa;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);