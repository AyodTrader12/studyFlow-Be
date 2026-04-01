import admin from "firebase-admin"
import { Auth } from "firebase-admin/auth"

const serviceAccount: admin.ServiceAccount = {
  projectId:   process.env.FIREBASE_PROJECT_ID!,
  privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
};
 
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
 
export const firebaseAdmin = admin;
export const auth: Auth = admin.auth();
 