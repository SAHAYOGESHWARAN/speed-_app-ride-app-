const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validation');
const { 
  updateUserSchema,
  adminUpdateUserSchema 
} = require('../validations/userSchemas');
const auditLog = require('../middleware/auditLog');
const upload = require('../middleware/multer');
const resizeImage = require('../middleware/imageProcessing');
const { checkResourceOwnership } = require('../middleware/ownership');

// Public routes
router.post('/verify-email/:token', 
  rateLimiter(5, 60),
  userController.verifyEmail
);

router.post('/forgot-password',
  rateLimiter(3, 60),
  userController.forgotPassword
);

router.patch('/reset-password/:token',
  rateLimiter(3, 60),
  userController.resetPassword
);

// Protected routes
router.use(auth.protect);

// Current user operations
router.get('/me',
  rateLimiter(60, 15),
  userController.getMe
);

router.patch('/update-me',
  rateLimiter(10, 60),
  upload.single('avatar'),
  resizeImage(500, 500),
  validate(updateUserSchema),
  auditLog('USER_UPDATE'),
  userController.updateMe
);

router.delete('/delete-me',
  rateLimiter(1, 1440), // 1 request per day
  auditLog('USER_DELETE'),
  userController.deleteMe
);

// User sessions management
router.get('/sessions',
  rateLimiter(30, 15),
  userController.getSessions
);

router.delete('/sessions/revoke/:sessionId',
  rateLimiter(10, 60),
  userController.revokeSession
);

// Admin-only routes
router.use(auth.restrictTo('admin', 'support'));

router.get('/',
  rateLimiter(300, 15), // Higher limit for admins
  userController.getAllUsers
);

router.get('/stats',
  rateLimiter(60, 15),
  userController.getUserStats
);

router.get('/:id',
  rateLimiter(60, 15),
  userController.getUser
);

router.patch('/:id',
  rateLimiter(30, 15),
  validate(adminUpdateUserSchema),
  checkResourceOwnership('id'),
  auditLog('ADMIN_USER_UPDATE'),
  userController.updateUser
);

router.delete('/:id',
  rateLimiter(10, 60),
  checkResourceOwnership('id'),
  auditLog('ADMIN_USER_DELETE'),
  userController.deleteUser
);

// Webhooks
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  userController.handleUserWebhook
);

// Admin bulk operations
router.post('/bulk',
  rateLimiter(5, 1440), // 5 requests per day
  auth.restrictTo('admin'),
  userController.bulkUserActions
);

module.exports = router;