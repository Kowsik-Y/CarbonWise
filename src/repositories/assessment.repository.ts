import { prisma } from "@/lib/db";
import { isFirebaseConfigured, db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc,
  Timestamp 
} from "firebase/firestore";
import { CarbonAssessment } from "@/types";
import { convertFirestoreQuery } from "@/lib/firestore-utils";

export class AssessmentRepository {
  /**
   * Retrieves the user's most recent carbon assessment.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A promise resolving to the latest CarbonAssessment or null if none exists.
   */
  async getLatestAssessment(userId: string): Promise<CarbonAssessment | null> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "assessments");
      const q = query(colRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const list = convertFirestoreQuery<CarbonAssessment>(snap);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list[0];
    } else {
      const assessment = await prisma.carbonAssessment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return assessment as CarbonAssessment | null;
    }
  }

  /**
   * Retrieves the historical list of carbon assessments for a user, sorted ascending by date.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A promise resolving to an array of CarbonAssessments.
   */
  async getAssessmentsHistory(userId: string): Promise<CarbonAssessment[]> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "assessments");
      const q = query(colRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      const list = convertFirestoreQuery<CarbonAssessment>(snap);
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return list;
    } else {
      const assessments = await prisma.carbonAssessment.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      return assessments as CarbonAssessment[];
    }
  }

  /**
   * Saves a new carbon footprint assessment record.
   * 
   * @param userId - Unique identifier of the user.
   * @param data - The footprint parameters and calculated category emissions.
   * @returns A promise resolving to the created CarbonAssessment.
   */
  async saveAssessment(userId: string, data: Omit<CarbonAssessment, "id" | "userId" | "createdAt">): Promise<CarbonAssessment> {
    if (isFirebaseConfigured && db) {
      const assessmentRef = collection(db, "assessments");
      const docRef = await addDoc(assessmentRef, {
        userId,
        ...data,
        createdAt: Timestamp.now()
      });
      return { id: docRef.id, userId, ...data, createdAt: new Date() } as CarbonAssessment;
    } else {
      const created = await prisma.carbonAssessment.create({
        data: {
          userId,
          ...data,
        }
      });
      return created as CarbonAssessment;
    }
  }

  /**
   * Deletes all carbon assessment records for a user.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteAssessments(userId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      const { writeBatch } = await import("firebase/firestore");
      const colRef = collection(db, "assessments");
      const q = query(colRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } else {
      await prisma.carbonAssessment.deleteMany({
        where: { userId },
      });
    }
  }
}

export const assessmentRepository = new AssessmentRepository();
