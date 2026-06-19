/* eslint-disable */
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

function convertDoc(docSnap: any) {
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  const result: any = { id: docSnap.id, ...data };
  
  for (const key of Object.keys(result)) {
    if (result[key] && typeof result[key].toDate === "function") {
      result[key] = result[key].toDate();
    }
  }
  return result;
}

function convertQuery(querySnap: any) {
  const list: any[] = [];
  querySnap.forEach((docSnap: any) => {
    const item = convertDoc(docSnap);
    if (item) list.push(item);
  });
  return list;
}

export class GoalRepository {
  async getUserGoals(userId: string): Promise<Goal[]> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "goals");
      const q = query(colRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      const list = convertQuery(snap);
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list as Goal[];
    } else {
      const goals = await prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return goals as Goal[];
    }
  }

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

  async updateGoal(userId: string, goalId: string, status: "ACTIVE" | "COMPLETED"): Promise<Goal | null> {
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, "goals", goalId);
      const updateData: any = { status };
      if (status === "COMPLETED") {
        updateData.completedAt = Timestamp.now();
      }
      await updateDoc(docRef, updateData);
      const updatedSnap = await getDoc(docRef);
      return convertDoc(updatedSnap) as Goal | null;
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
