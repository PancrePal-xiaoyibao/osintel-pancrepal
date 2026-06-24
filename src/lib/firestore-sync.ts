import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PatientProfile } from '../types';

/**
 * Saves or updates a patient profile in Firestore under the user's UID.
 */
export async function savePatientProfileToCloud(uid: string, profile: PatientProfile): Promise<void> {
  try {
    const docRef = doc(db, 'patient_profiles', uid);
    await setDoc(docRef, {
      uid,
      ...profile,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    console.log('Successfully saved patient profile to Firestore Cloud.');
  } catch (err) {
    console.warn('Error saving patient profile to Firestore:', err);
    throw err;
  }
}

/**
 * Loads a patient profile from Firestore for a given UID.
 */
export async function loadPatientProfileFromCloud(uid: string): Promise<PatientProfile | null> {
  try {
    const docRef = doc(db, 'patient_profiles', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const profile: PatientProfile = {
        city: data.city || '',
        mutations: data.mutations || [],
        ihcResults: data.ihcResults || '',
        regimen: data.regimen || '',
        efficacy: data.efficacy || '',
        summary: data.summary || '',
        lastUpdated: data.lastUpdated || new Date().toISOString()
      };
      return profile;
    }
    return null;
  } catch (err) {
    console.warn('Error loading patient profile from Firestore:', err);
    return null;
  }
}

/**
 * Clears the patient profile from cloud database for a given UID.
 */
export async function deletePatientProfileFromCloud(uid: string): Promise<void> {
  try {
    const docRef = doc(db, 'patient_profiles', uid);
    await deleteDoc(docRef);
    console.log('Successfully deleted patient profile from Firestore Cloud.');
  } catch (err) {
    console.warn('Error deleting patient profile from Firestore:', err);
    throw err;
  }
}
