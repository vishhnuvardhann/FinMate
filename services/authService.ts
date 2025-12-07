
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
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
    
    // Ensure user document exists
    await DataService.initUser(user.uid);
    return user;
  },

  signup: async (name: string, email: string, password: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    if (!fbUser) throw new Error("Signup failed");
    
    // Update profile with name and avatar
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
    
    // Initialize empty data in Firestore
    await DataService.initUser(user.uid);
    
    return user;
  },

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

    // Ensure user document exists (init if new user)
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
