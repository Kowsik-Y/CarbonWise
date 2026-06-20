import { prisma } from "@/lib/db";
import { isFirebaseConfigured, db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc,
  updateDoc,
  Timestamp 
} from "firebase/firestore";
import { UserChallenge } from "@/types";
import { convertFirestoreDoc, convertFirestoreQuery } from "@/lib/firestore-utils";

export class ChallengeRepository {
  /**
   * Retrieves all challenges associated with a specific user.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A promise resolving to an array of UserChallenges.
   */
  async getUserChallenges(userId: string): Promise<UserChallenge[]> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "userChallenges");
      const q = query(colRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      return convertFirestoreQuery<UserChallenge>(snap);
    } else {
      const userChallenges = await prisma.userChallenge.findMany({
        where: { userId },
      });
      return userChallenges as UserChallenge[];
    }
  }

  /**
   * Registers a user for a specific community or AI challenge.
   * 
   * @param userId - Unique identifier of the user.
   * @param challengeCode - Code identifying the challenge.
   * @returns A promise resolving to the created UserChallenge.
   */
  async joinChallenge(userId: string, challengeCode: string): Promise<UserChallenge> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "userChallenges");
      const docRef = await addDoc(colRef, {
        userId,
        challengeCode,
        status: "JOINED",
        joinedAt: Timestamp.now()
      });
      return { id: docRef.id, userId, challengeCode, status: "JOINED", joinedAt: new Date() } as UserChallenge;
    } else {
      const created = await prisma.userChallenge.create({
        data: {
          userId,
          challengeCode,
          status: "JOINED",
        },
      });
      return created as UserChallenge;
    }
  }

  /**
   * Marks an active user challenge as completed.
   * Throws an error if the challenge enrollment is not found or is already completed.
   * 
   * @param userId - Unique identifier of the user.
   * @param enrollmentId - Unique identifier of the user's challenge enrollment.
   * @returns A promise resolving to the updated UserChallenge.
   */
  async completeChallenge(userId: string, enrollmentId: string): Promise<UserChallenge> {
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, "userChallenges", enrollmentId);
      const snap = await getDoc(docRef);
      if (!snap.exists() || snap.data()?.userId !== userId || snap.data()?.status !== "JOINED") {
        throw new Error("Challenge enrollment not found or already completed");
      }

      await updateDoc(docRef, {
        status: "COMPLETED",
        completedAt: Timestamp.now()
      });

      const updatedSnap = await getDoc(docRef);
      const updated = convertFirestoreDoc<UserChallenge>(updatedSnap);
      if (!updated) {
        throw new Error("Failed to load completed challenge details");
      }
      return updated;
    } else {
      const userChallenge = await prisma.userChallenge.findFirst({
        where: { id: enrollmentId, userId, status: "JOINED" },
      });
      if (!userChallenge) {
        throw new Error("Challenge enrollment not found or already completed");
      }
      const updated = await prisma.userChallenge.update({
        where: { id: enrollmentId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
      return updated as UserChallenge;
    }
  }
}

export const challengeRepository = new ChallengeRepository();
