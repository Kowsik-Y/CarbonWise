import { DocumentSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";

/**
 * Converts a Firestore DocumentSnapshot into a typed object with its document ID,
 * recursively checking and converting Firestore Timestamp fields to JavaScript Date objects.
 */
export function convertFirestoreDoc<T>(docSnap: DocumentSnapshot<DocumentData>): T | null {
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  if (!data) return null;

  // Clone document data and inject document ID
  const result = { id: docSnap.id, ...data } as Record<string, unknown>;

  for (const key of Object.keys(result)) {
    const value = result[key];
    if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
      result[key] = (value as { toDate: () => Date }).toDate();
    }
  }

  return result as T;
}

/**
 * Converts all documents in a Firestore QuerySnapshot into an array of typed objects.
 */
export function convertFirestoreQuery<T>(querySnap: QuerySnapshot<DocumentData>): T[] {
  const list: T[] = [];
  querySnap.forEach((docSnap) => {
    const item = convertFirestoreDoc<T>(docSnap);
    if (item) {
      list.push(item);
    }
  });
  return list;
}
