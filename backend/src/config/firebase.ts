import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Firebase Admin SDK configuration
interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

// Environment variables validation
const validateFirebaseConfig = (): FirebaseConfig => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase configuration. Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in environment variables."
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"), // Handle escaped newlines
  };
};

// Initialize Firebase Admin SDK
let firebaseApp: App;
let firebaseAuth: Auth;
let firebaseFirestore: Firestore;

try {
  const config = validateFirebaseConfig();

  // Check if Firebase app is already initialized
  if (getApps().length === 0) {
    firebaseApp = initializeApp({
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
      projectId: config.projectId,
    });

    console.log("✅ Firebase Admin SDK initialized successfully");
  } else {
    firebaseApp = getApps()[0];
    console.log("✅ Firebase Admin SDK already initialized");
  }

  // Initialize Firebase services
  firebaseAuth = getAuth(firebaseApp);
  firebaseFirestore = getFirestore(firebaseApp);

  // Configure Firestore settings
  firebaseFirestore.settings({
    ignoreUndefinedProperties: true,
  });
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin SDK:", error);
  throw error;
}

// Export Firebase services
export { firebaseApp, firebaseAuth, firebaseFirestore };

// Export types for better TypeScript support
export type { Auth as FirebaseAuth, Firestore as FirebaseFirestore };

// Health check function
export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    // Test Firestore connection
    await firebaseFirestore.collection("_health_check").limit(1).get();
    return true;
  } catch (error) {
    console.error("Firebase connection check failed:", error);
    return false;
  }
};
