import express from 'express';
import { signupUser, loginUser } from '../controllers/userController.js';

const router = express.Router();

/**
 * POST /api/users/signup
 * Sign up a new user
 */
router.post('/signup', signupUser);

/**
 * POST /api/users/login
 * Login a user
 */
router.post('/login', loginUser);

export default router;
