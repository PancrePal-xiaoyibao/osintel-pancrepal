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
import type { CenterDoctor } from './types';

const COLLECTION = 'doctors';

export interface ListDoctorsOptions {
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
  hospitalId?: string;
  specialty?: string;
  title?: string;
  minQualityScore?: number;
  orderByField?: 'name' | 'qualityScore' | 'patientVolume' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

export interface ListDoctorsResult {
  doctors: CenterDoctor[];
  lastDoc: DocumentSnapshot | null;
  total: number;
}

export async function listDoctors(options: ListDoctorsOptions = {}): Promise<ListDoctorsResult> {
  const constraints: QueryConstraint[] = [];
  const pageSize = options.limit ?? 20;

  if (options.hospitalId) constraints.push(where('hospitalIds', 'array-contains', options.hospitalId));
  if (options.specialty) constraints.push(where('specialties', 'array-contains', options.specialty));
  if (options.title) constraints.push(where('title', '==', options.title));

  const orderField = options.orderByField ?? 'qualityScore';
  const orderDir = options.orderDirection ?? 'desc';
  constraints.push(orderBy(orderField, orderDir));

  if (options.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  }

  constraints.push(limit(pageSize + 1));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const doctors: CenterDoctor[] = [];
  let lastDoc: DocumentSnapshot | null = null;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as CenterDoctor;
    doctors.push({ ...data, id: docSnap.id });
  });

  const hasMore = doctors.length > pageSize;
  if (hasMore) {
    doctors.pop();
    lastDoc = snapshot.docs[snapshot.docs.length - 2];
  }

  return { doctors, lastDoc, total: doctors.length };
}

export async function getDoctor(id: string): Promise<CenterDoctor | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as CenterDoctor;
    }
    return null;
  } catch (err) {
    console.warn('Error getting doctor from Firestore:', err);
    return null;
  }
}

export async function createDoctor(doctor: CenterDoctor): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, doctor.id);
    await setDoc(docRef, doctor);
    console.log(`Doctor created: ${doctor.id}`);
  } catch (err) {
    console.warn('Error creating doctor in Firestore:', err);
    throw err;
  }
}

export async function updateDoctor(id: string, updates: Partial<CenterDoctor>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
    console.log(`Doctor updated: ${id}`);
  } catch (err) {
    console.warn('Error updating doctor in Firestore:', err);
    throw err;
  }
}
