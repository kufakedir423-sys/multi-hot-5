import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDKIeWqzYufQ-ziapv1VfyOme9Tks-NZ18',
  authDomain: 'fir-machine-ee799.firebaseapp.com',
  projectId: 'fir-machine-ee799',
  storageBucket: 'fir-machine-ee799.firebasestorage.app',
  messagingSenderId: '618437494681',
  appId: '1:618437494681:web:89c79016dc94d4cf00b508',
  measurementId: 'G-N7XEDR5EVB',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
