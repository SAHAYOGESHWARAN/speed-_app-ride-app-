const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { StatusCodes } = require('http-status-codes');
const { RateLimiterMemory } = 'rate-limiter-flexible';
const User = require('../models/User');
const sendEmail = require('../utils/email');
const { AppError, ValidationError, AuthError } = require('../utils/errors');
const { validateInput } = require('../utils/validation');
const logger = require('../utils/logger');
const sessionManager = require('../utils/sessionManager');

// Rate limiter configurations
const loginRateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60 * 15, // 15 minutes
});

const passwordResetLimiter = new RateLimiterMemory({
  points: 3, // 3 attempts
  duration: 60 * 60, // 1 hour
});

// Token generation utilities
const generateAccessToken = (userId) => {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES,
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES,
  });
};

// Authentication controller
module.exports = {
  signup: async (req, res, next) => {
    try {
      await validateInput(req.body, {
        name: 'required|string|min:2|max:50',
        email: 'required|email|unique:User',
        password: 'required|strongPassword',
      });

      const user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      
      await sessionManager.createSession({
        userId: user.id,
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Send verification email
      const verificationToken = user.generateEmailVerificationToken();
      await user.save({ validateBeforeSave: false });
      
      await sendEmail({
        template: 'welcome',
        to: user.email,
        context: {
          name: user.name,
          verificationUrl: `${process.env.CLIENT_URL}/verify-email/${verificationToken}`,
        },
      });

      res
        .status(StatusCodes.CREATED)
        .cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })
        .json({
          success: true,
          accessToken,
          user: user.toAuthJSON(),
        });

      logger.info(`New user registered: ${user.email}`);
    } catch (err) {
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      await loginRateLimiter.consume(req.ip);

      const { email, password, otp } = req.body;
      
      const user = await User.findOne({ email })
        .select('+password +mfaSecret +loginAttempts +lockedUntil')
        .exec();

      if (!user || !(await user.comparePassword(password))) {
        throw new AuthError('Invalid credentials', StatusCodes.UNAUTHORIZED);
      }

      if (user.isAccountLocked()) {
        throw new AuthError('Account temporarily locked', StatusCodes.TOO_MANY_REQUESTS);
      }

      if (user.mfaEnabled && !user.verifyMfaToken(otp)) {
        await user.handleFailedLoginAttempt();
        throw new AuthError('Invalid MFA code', StatusCodes.UNAUTHORIZED);
      }

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      await sessionManager.createSession({
        userId: user.id,
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      await user.handleSuccessfulLogin();

      res
        .status(StatusCodes.OK)
        .cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .json({
          success: true,
          accessToken,
          user: user.toAuthJSON(),
        });

      logger.info(`User logged in: ${user.email}`);
    } catch (err) {
      if (err instanceof AuthError) {
        logger.warn(`Failed login attempt for email: ${req.body.email}`);
      }
      next(err);
    }
  },

  forgotPassword: async (req, res, next) => {
    try {
      await passwordResetLimiter.consume(req.ip);
      
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        throw new AppError('User not found', StatusCodes.NOT_FOUND);
      }

      const resetCode = user.generatePasswordResetCode();
      await user.save({ validateBeforeSave: false });

      await sendEmail({
        template: 'password-reset',
        to: user.email,
        context: {
          name: user.name,
          resetCode,
          expiresIn: process.env.PASSWORD_RESET_EXPIRES,
        },
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Password reset code sent to email',
        resetToken: user.passwordResetToken, // For development only
      });

      logger.info(`Password reset initiated for: ${user.email}`);
    } catch (err) {
      next(err);
    }
  },

  resetPassword: async (req, res, next) => {
    try {
      const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!user) {
        throw new AppError('Invalid or expired token', StatusCodes.BAD_REQUEST);
      }

      if (await user.comparePassword(req.body.password)) {
        throw new ValidationError('New password must be different from old password');
      }

      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.passwordChangedAt = Date.now();
      await user.save();

      // Invalidate all existing sessions
      await sessionManager.revokeAllSessions(user.id);

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Password updated successfully',
      });

      logger.info(`Password reset for: ${user.email}`);
    } catch (err) {
      next(err);
    }
  },

  refreshTokens: async (req, res, next) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new AuthError('Refresh token required', StatusCodes.BAD_REQUEST);
      }

      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const session = await sessionManager.verifySession(payload.sub, refreshToken);

      const newAccessToken = generateAccessToken(session.userId);
      const newRefreshToken = generateRefreshToken(session.userId);

      await sessionManager.rotateSession(session.id, newRefreshToken);

      res
        .status(StatusCodes.OK)
        .cookie('refreshToken', newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .json({
          success: true,
          accessToken: newAccessToken,
        });
    } catch (err) {
      next(err);
    }
  },

  logout: async (req, res, next) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) {
        await sessionManager.revokeSession(refreshToken);
      }

      res
        .clearCookie('refreshToken')
        .status(StatusCodes.OK)
        .json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },
};