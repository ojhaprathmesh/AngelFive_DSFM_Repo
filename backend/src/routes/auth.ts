import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { authService } from "../services/auth";

const router: Router = Router();

// Type definitions for request bodies
interface LoginRequest {
  submissionType: "LOGIN";
  email: string;
  password: string;
  fullName: null;
  confirmPassword: null;
  timestamp: string;
}

interface SignupRequest {
  submissionType: "SIGNUP";
  email: string;
  password: string;
  fullName: string;
  confirmPassword: string;
  timestamp: string;
}

// Enhanced validation middleware for Firebase integration
const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("submissionType")
    .equals("LOGIN")
    .withMessage("Invalid submission type for login"),
];

const signupValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("fullName")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Full name must be at least 2 characters long"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
  body("submissionType")
    .equals("SIGNUP")
    .withMessage("Invalid submission type for signup"),
];

// Logging utility for authentication events
const logSubmission = (
  req: Request,
  type: string,
  status: "SUCCESS" | "ERROR",
  message?: string
) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.get("User-Agent") || "unknown";

  console.log(`[${timestamp}] AUTH_${type}_${status}:`, {
    ip,
    userAgent,
    message: message || `${type} ${status.toLowerCase()}`,
    email: req.body?.email ? `${req.body.email.substring(0, 3)}***` : "unknown",
  });
};

// Login endpoint with Firebase authentication
router.post(
  "/login",
  loginValidation,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logSubmission(
          req,
          "LOGIN",
          "ERROR",
          `Validation failed: ${errors
            .array()
            .map((e) => e.msg)
            .join(", ")}`
        );
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
      }

      const { email, password } = req.body as LoginRequest;

      // Authenticate with Firebase
      const authResult = await authService.signInUser(email, password);

      if (!authResult.success) {
        logSubmission(req, "LOGIN", "ERROR", authResult.error);

        // Map Firebase error codes to appropriate HTTP status codes
        let statusCode = 401;
        if (authResult.errorCode === "auth/user-not-found") {
          statusCode = 401;
        } else if (authResult.errorCode === "auth/user-disabled") {
          statusCode = 403;
        } else if (authResult.errorCode === "auth/invalid-credential") {
          statusCode = 401;
        }

        return res.status(statusCode).json({
          status: "error",
          message: authResult.error || "Authentication failed",
          timestamp: new Date().toISOString(),
        });
      }

      // Successful login
      logSubmission(req, "LOGIN", "SUCCESS", "User logged in successfully");

      return res.json({
        status: "success",
        message: "Login successful",
        data: {
          user: {
            uid: authResult.user!.uid,
            email: authResult.user!.email,
            fullName: authResult.user!.fullName,
            displayName: authResult.user!.displayName,
            emailVerified: authResult.user!.emailVerified,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Login error:", error);
      logSubmission(
        req,
        "LOGIN",
        "ERROR",
        `Server error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );

      return res.status(500).json({
        status: "error",
        message: "Internal server error during login",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Signup endpoint with Firebase authentication
router.post(
  "/signup",
  signupValidation,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logSubmission(
          req,
          "SIGNUP",
          "ERROR",
          `Validation failed: ${errors
            .array()
            .map((e) => e.msg)
            .join(", ")}`
        );
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
      }

      const { email, password, fullName } = req.body as SignupRequest;

      // Check if user already exists
      const emailExists = await authService.emailExists(email);
      if (emailExists) {
        logSubmission(req, "SIGNUP", "ERROR", "Email already registered");
        return res.status(409).json({
          status: "error",
          message: "An account with this email already exists",
          timestamp: new Date().toISOString(),
        });
      }

      // Create new user with Firebase
      const authResult = await authService.createUser({
        email,
        password,
        fullName,
        emailVerified: false,
      });

      if (!authResult.success) {
        logSubmission(req, "SIGNUP", "ERROR", authResult.error);

        // Map Firebase error codes to appropriate HTTP status codes
        let statusCode = 400;
        if (authResult.errorCode === "auth/email-already-exists") {
          statusCode = 409;
        } else if (authResult.errorCode === "auth/weak-password") {
          statusCode = 400;
        } else if (authResult.errorCode === "auth/invalid-email") {
          statusCode = 400;
        }

        return res.status(statusCode).json({
          status: "error",
          message: authResult.error || "Failed to create account",
          timestamp: new Date().toISOString(),
        });
      }

      // Successful signup
      logSubmission(req, "SIGNUP", "SUCCESS", "User registered successfully");

      return res.status(201).json({
        status: "success",
        message: "Account created successfully",
        data: {
          user: {
            uid: authResult.user!.uid,
            email: authResult.user!.email,
            fullName: authResult.user!.fullName,
            displayName: authResult.user!.displayName,
            emailVerified: authResult.user!.emailVerified,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Signup error:", error);
      logSubmission(
        req,
        "SIGNUP",
        "ERROR",
        `Server error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );

      return res.status(500).json({
        status: "error",
        message: "Internal server error during signup",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Health check for auth routes with Firebase integration
router.get("/health", async (req: Request, res: Response) => {
  try {
    // Check Firebase connection
    const { checkFirebaseConnection } = await import("../config/firebase");
    const firebaseHealthy = await checkFirebaseConnection();

    res.json({
      status: firebaseHealthy ? "healthy" : "degraded",
      service: "authentication",
      firebase: {
        connected: firebaseHealthy,
        admin_sdk: "initialized",
      },
      endpoints: ["/login", "/signup"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      service: "authentication",
      error: "Firebase connection failed",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
