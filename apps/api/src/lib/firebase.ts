import admin from 'firebase-admin';
import { config } from '../config.js';

// Credentials are considered real if they're not placeholder values
const isReal =
  config.FIREBASE_PROJECT_ID !== 'placeholder' &&
  config.FIREBASE_PRIVATE_KEY !== 'placeholder' &&
  config.FIREBASE_CLIENT_EMAIL !== 'placeholder@placeholder.iam.gserviceaccount.com';

let _messaging: admin.messaging.Messaging | null = null;

export function getMessaging(): admin.messaging.Messaging | null {
  if (!isReal) return null;

  if (!_messaging) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.FIREBASE_PROJECT_ID,
          privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: config.FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
    _messaging = admin.messaging();
  }

  return _messaging;
}
