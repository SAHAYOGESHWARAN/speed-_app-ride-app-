const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { rateLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validation');
const {
  signupSchema,
  loginSchema,
  passwordResetSchema
} = require('../validations/authSchemas');
const passport = require('passport');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');

// API Documentation
router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public routes
router.post(
  '/signup',
  rateLimiter(5, 60), // 5 requests per minute
  validate(signupSchema),
  authController.signup
);

router.post(
  '/login',
  rateLimiter(5, 15), // 5 requests per 15 minutes
  validate(loginSchema),
  authController.login
);

// OAuth2 Routes
router.get('/auth/google', passport.authenticate('google', { session: false }));
router.get('/auth/google/callback', 
  passport.authenticate('google', { session: false }),
  authController.oauthCallback
);

router.get('/auth/facebook', passport.authenticate('facebook', { session: false }));
router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  authController.oauthCallback
);

// Password management
router.post(
  '/forgot-password',
  rateLimiter(3, 60),
  validate(passwordResetSchema),
  authController.forgotPassword
);

router.patch(
  '/reset-password/:token',
  rateLimiter(3, 60),
  authController.resetPassword
);

// Email verification
router.post(
  '/send-verification-email',
  rateLimiter(2, 60),
  authController.sendVerificationEmail
);

router.get(
  '/verify-email/:token',
  authController.verifyEmail
);

// Protected routes (require authentication)
router.use(authController.authenticate);

// Session management
router.get('/sessions', authController.listSessions);
router.delete('/sessions/revoke/:sessionId', authController.revokeSession);

// User management
router.get('/me', authController.getMe);
router.patch(
  '/update-me',
  authController.uploadUserPhoto,
  authController.resizeUserPhoto,
  authController.updateMe
);

// Security
router.patch(
  '/update-password',
  validate(passwordResetSchema),
  authController.updatePassword
);

router.post('/mfa/enable', authController.enableMFA);
router.post('/mfa/verify', authController.verifyMFA);
router.get('/mfa/backup-codes', authController.getBackupCodes);

// Admin-only routes
router.use(authController.restrictTo('admin'));
router.get('/users', authController.getAllUsers);
router.delete('/users/:id', authController.deleteUser);

// Logout
router.post('/logout', authController.logout);

module.exports = router;