const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Protect all routes after this middleware
router.use(auth.protect);

router.get('/me', userController.getMe);
router.patch('/updateme', userController.updateMe);
router.delete('/deleteme', userController.deleteMe);

// Restrict to admin only
router.use(auth.authorize('admin'));

router
  .route('/')
  .get(userController.getAllUsers);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;