import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { CenterHospital, HospitalLevel, HospitalType } from './types';

const COLLECTION = 'hospitals';

export interface ListHospitalsOptions {
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
  city?: string;
  province?: string;
  country?: string;
  hospitalLevel?: HospitalLevel;
  hospitalType?: HospitalType;
  minQualityScore?: number;
  orderByField?: 'name' | 'qualityScore' | 'pancreaticAnnualSurgeries' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

export interface ListHospitalsResult {
  hospitals: CenterHospital[];
  lastDoc: DocumentSnapshot | null;
  total: number;
}

export async function listHospitals(options: ListHospitalsOptions = {}): Promise<ListHospitalsResult> {
  const constraints: QueryConstraint[] = [];
  const pageSize = options.limit ?? 20;

  if (options.city) constraints.push(where('city', '==', options.city));
  if (options.province) constraints.push(where('province', '==', options.province));
  if (options.country) constraints.push(where('country', '==', options.country));
  if (options.hospitalLevel) constraints.push(where('hospitalLevel', '==', options.hospitalLevel));
  if (options.hospitalType) constraints.push(where('hospitalType', '==', options.hospitalType));

  const orderField = options.orderByField ?? 'qualityScore';
  const orderDir = options.orderDirection ?? 'desc';
  if (orderField === 'qualityScore') {
    if (options.minQualityScore !== undefined) {
      constraints.push(where('qualityScore', '>=', options.minQualityScore));
    }
  }
  constraints.push(orderBy(orderField, orderDir));

  if (options.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  }

  constraints.push(limit(pageSize + 1));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const hospitals: CenterHospital[] = [];
  let lastDoc: DocumentSnapshot | null = null;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as CenterHospital;
    hospitals.push({ ...data, id: docSnap.id });
  });

  const hasMore = hospitals.length > pageSize;
  if (hasMore) {
    hospitals.pop();
    lastDoc = snapshot.docs[snapshot.docs.length - 2];
  }

  // Firestore getDocs doesn't support count; return results length as proxy
  return { hospitals, lastDoc, total: hospitals.length };
}

export async function getHospital(id: string): Promise<CenterHospital | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as CenterHospital;
    }
    return null;
  } catch (err) {
    console.warn('Error getting hospital from Firestore:', err);
    return null;
  }
}

export async function createHospital(hospital: CenterHospital): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, hospital.id);
    await setDoc(docRef, hospital);
    console.log(`Hospital created: ${hospital.id}`);
  } catch (err) {
    console.warn('Error creating hospital in Firestore:', err);
    throw err;
  }
}

export async function updateHospital(id: string, updates: Partial<CenterHospital>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
    console.log(`Hospital updated: ${id}`);
  } catch (err) {
    console.warn('Error updating hospital in Firestore:', err);
    throw err;
  }
}
