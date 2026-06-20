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
import { Goal } from "@/types";
import { convertFirestoreDoc, convertFirestoreQuery } from "@/lib/firestore-utils";

export class GoalRepository {
  /**
   * Retrieves all goals associated with a specific user.
   * Sorts the goals descending by their creation timestamp.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A promise resolving to an array of Goals.
   */
  async getUserGoals(userId: string): Promise<Goal[]> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "goals");
      const q = query(colRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      const list = convertFirestoreQuery<Goal>(snap);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } else {
      const goals = await prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return goals as Goal[];
    }
  }

  /**
   * Adds a new active carbon-reduction goal for the user.
   * 
   * @param userId - Unique identifier of the user.
   * @param data - The details of the goal.
   * @returns A promise resolving to the created Goal.
   */
  async addGoal(userId: string, data: { title: string; category: Goal["category"]; co2Reduction: number; difficulty: Goal["difficulty"] }): Promise<Goal> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "goals");
      const docRef = await addDoc(colRef, {
        userId,
        ...data,
        status: "ACTIVE",
        createdAt: Timestamp.now()
      });
      return { id: docRef.id, userId, ...data, status: "ACTIVE", createdAt: new Date() } as Goal;
    } else {
      const created = await prisma.goal.create({
        data: {
          userId,
          title: data.title,
          category: data.category,
          co2Reduction: data.co2Reduction,
          difficulty: data.difficulty,
          status: "ACTIVE",
        }
      });
      return created as Goal;
    }
  }

  /**
   * Updates a user's goal status (e.g., marks it completed).
   * 
   * @param userId - Unique identifier of the user.
   * @param goalId - The identifier of the goal to update.
   * @param status - The target status.
   * @returns The updated Goal details or null.
   */
  async updateGoal(userId: string, goalId: string, status: "ACTIVE" | "COMPLETED"): Promise<Goal | null> {
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, "goals", goalId);
      const updateData: { status: "ACTIVE" | "COMPLETED"; completedAt?: Timestamp } = { status };
      if (status === "COMPLETED") {
        updateData.completedAt = Timestamp.now();
      }
      await updateDoc(docRef, updateData);
      const updatedSnap = await getDoc(docRef);
      return convertFirestoreDoc<Goal>(updatedSnap);
    } else {
      const updated = await prisma.goal.update({
        where: { id: goalId, userId },
        data: {
          status,
          completedAt: status === "COMPLETED" ? new Date() : null,
        }
      });
      return updated as Goal;
    }
  }
}

export const goalRepository = new GoalRepository();
