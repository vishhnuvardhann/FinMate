import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  updateProfile, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

import { auth, googleProvider } from '../config/firebaseConfig';
import { User } from '../types';
import { DataService } from './dataService';

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;
    
    if (!fbUser) throw new Error("Login failed");

    const user: User = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL
    };
    
    await DataService.initUser(user.uid);
    return user;
  },

  signup: async (name: string, email: string, password: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    if (!fbUser) throw new Error("Signup failed");
    
    const photoURL = `https://ui-avatars.com/api/?name=${name}&background=4f46e5&color=fff`;
    await updateProfile(fbUser, {
      displayName: name,
      photoURL: photoURL
    });

    const user: User = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: name,
      photoURL: photoURL
    };
    
    await DataService.initUser(user.uid);
    return user;
  },

  // ⭐ ORIGINAL POPUP LOGIN (website)
  loginWithGoogle: async (): Promise<User> => {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    if (!fbUser) throw new Error("Google login failed");

    const user: User = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL
    };

    await DataService.initUser(user.uid);
    return user;
  },

  // ⭐ NEW: Redirect login for Android WebView
  loginWithGoogleRedirect: async (): Promise<void> => {
    await signInWithRedirect(auth, googleProvider);
  },

  // ⭐ NEW: Handle redirect result for WebView
  handleRedirectCallback: async (): Promise<User | null> => {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const fbUser = result.user;
    if (!fbUser) return null;

    const user: User = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL
    };

    await DataService.initUser(user.uid);
    return user;
  },

  logout: async () => {
    await signOut(auth);
  },

  getCurrentUser: (): User | null => {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    return {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL
    };
  },
  
  subscribeToAuth: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        callback({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL
        });
      } else {
        callback(null);
      }
    });
  }
};
