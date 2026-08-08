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
import type { CenterService, ServiceCategory, ServiceAvailability } from './types';

const COLLECTION = 'services';

export interface ListServicesOptions {
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
  hospitalId?: string;
  category?: ServiceCategory;
  availability?: ServiceAvailability;
  minQualityScore?: number;
  orderByField?: 'name' | 'qualityScore' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

export interface ListServicesResult {
  services: CenterService[];
  lastDoc: DocumentSnapshot | null;
  total: number;
}

export async function listServices(options: ListServicesOptions = {}): Promise<ListServicesResult> {
  const constraints: QueryConstraint[] = [];
  const pageSize = options.limit ?? 20;

  if (options.hospitalId) constraints.push(where('hospitalId', '==', options.hospitalId));
  if (options.category) constraints.push(where('category', '==', options.category));
  if (options.availability) constraints.push(where('availability', '==', options.availability));

  const orderField = options.orderByField ?? 'qualityScore';
  const orderDir = options.orderDirection ?? 'desc';
  constraints.push(orderBy(orderField, orderDir));

  if (options.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  }

  constraints.push(limit(pageSize + 1));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const services: CenterService[] = [];
  let lastDoc: DocumentSnapshot | null = null;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as CenterService;
    services.push({ ...data, id: docSnap.id });
  });

  const hasMore = services.length > pageSize;
  if (hasMore) {
    services.pop();
    lastDoc = snapshot.docs[snapshot.docs.length - 2];
  }

  return { services, lastDoc, total: services.length };
}

export async function getService(id: string): Promise<CenterService | null> {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as CenterService;
    }
    return null;
  } catch (err) {
    console.warn('Error getting service from Firestore:', err);
    return null;
  }
}

export async function createService(service: CenterService): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, service.id);
    await setDoc(docRef, service);
    console.log(`Service created: ${service.id}`);
  } catch (err) {
    console.warn('Error creating service in Firestore:', err);
    throw err;
  }
}

export async function updateService(id: string, updates: Partial<CenterService>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id);
    await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
    console.log(`Service updated: ${id}`);
  } catch (err) {
    console.warn('Error updating service in Firestore:', err);
    throw err;
  }
}
