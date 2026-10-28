import { initializeApp } from 'firebase/app'
import { firebaseConfig } from './config'

/** The one Firebase app that sign-in and the database share. */
export const app = initializeApp(firebaseConfig)
