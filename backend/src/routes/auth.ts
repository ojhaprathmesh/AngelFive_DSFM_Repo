import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

const router: Router = Router();

// Type definitions for request bodies
interface LoginRequest {
  submissionType: 'LOGIN';
  email: string;
  password: string;
  fullName: null;
  confirmPassword: null;
  timestamp: string;
}

interface SignupRequest {
  submissionType: 'SIGNUP';
  email: string;
  password: string;
  fullName: string;
  confirmPassword: string;
  timestamp: string;
}

// Validation middleware
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('submissionType')
    .equals('LOGIN')
    .withMessage('Invalid submission type for login'),
];

const signupValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('fullName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Full name must be at least 2 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  body('submissionType')
    .equals('SIGNUP')
    .withMessage('Invalid submission type for signup'),
];

// Logging utility
const logSubmission = (req: Request, type: string, status: 'SUCCESS' | 'ERROR', message?: string) => {
  const logData = {
    timestamp: new Date().toISOString(),
    submissionType: type,
    status,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('User-Agent'),
    payload: {
      email: req.body.email,
      fullName: req.body.fullName || null,
      submissionTimestamp: req.body.timestamp,
    },
    message: message || '',
  };
  
  console.log('=== AUTH SUBMISSION LOG ===');
  console.log(JSON.stringify(logData, null, 2));
  console.log('=========================');
};

// Mock user database (in production, this would be a real database)
const users: Array<{ id: string; email: string; password: string; fullName: string; createdAt: string }> = [];

// Helper function to find user by email
const findUserByEmail = (email: string) => {
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
};

// Helper function to create user
const createUser = (email: string, password: string, fullName: string) => {
  const user = {
    id: Date.now().toString(),
    email: email.toLowerCase(),
    password, // TODO: In production, this should be hashed
    fullName,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
};

// Login endpoint
router.post('/login', loginValidation, async (req: Request, res: Response): Promise<Response> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logSubmission(req, 'LOGIN', 'ERROR', `Validation failed: ${errors.array().map(e => e.msg).join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString(),
      });
    }

    const { email, password } = req.body as LoginRequest;

    // Find user
    const user = findUserByEmail(email);
    if (!user) {
      logSubmission(req, 'LOGIN', 'ERROR', 'User not found');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        timestamp: new Date().toISOString(),
      });
    }

    // Check password (in production, compare with hashed password)
    if (user.password !== password) {
      logSubmission(req, 'LOGIN', 'ERROR', 'Invalid password');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        timestamp: new Date().toISOString(),
      });
    }

    // Successful login
    logSubmission(req, 'LOGIN', 'SUCCESS', 'User logged in successfully');
    
    return res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Login error:', error);
    logSubmission(req, 'LOGIN', 'ERROR', `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during login',
      timestamp: new Date().toISOString(),
    });
  }
});

// Signup endpoint
router.post('/signup', signupValidation, async (req: Request, res: Response): Promise<Response> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logSubmission(req, 'SIGNUP', 'ERROR', `Validation failed: ${errors.array().map(e => e.msg).join(', ')}`);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString(),
      });
    }

    const { email, password, fullName } = req.body as SignupRequest;

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      logSubmission(req, 'SIGNUP', 'ERROR', 'Email already registered');
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists',
        timestamp: new Date().toISOString(),
      });
    }

    // Create new user
    const newUser = createUser(email, password, fullName);

    // Successful signup
    logSubmission(req, 'SIGNUP', 'SUCCESS', 'User registered successfully');
    
    return res.status(201).json({
      status: 'success',
      message: 'Account created successfully',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Signup error:', error);
    logSubmission(req, 'SIGNUP', 'ERROR', `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during signup',
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check for auth routes
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'authentication',
    endpoints: ['/login', '/signup'],
    timestamp: new Date().toISOString(),
    registeredUsers: users.length,
  });
});

export default router;