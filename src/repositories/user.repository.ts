/* eslint-disable */
import { prisma } from "@/lib/db";
import { isFirebaseConfigured, db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc,
  Timestamp 
} from "firebase/firestore";
import { User, Achievement } from "@/types";

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

export class UserRepository {
  async getUserProfile(userId: string): Promise<User | null> {
    if (isFirebaseConfigured && db) {
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);
      return convertDoc(snap) as User | null;
    } else {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          points: true,
          level: true,
          createdAt: true,
        },
      });
      return user as User | null;
    }
  }

  async createUserProfile(userId: string, data: { name: string; email: string }): Promise<User> {
    if (isFirebaseConfigured && db) {
      const userRef = doc(db, "users", userId);
      const profile = {
        name: data.name,
        email: data.email,
        points: 0,
        level: 1,
        createdAt: Timestamp.now()
      };
      await setDoc(userRef, profile);
      return { id: userId, ...profile, createdAt: new Date() } as User;
    } else {
      const user = await prisma.user.create({
        data: {
          id: userId,
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash: "", // Firebase user
          points: 0,
          level: 1,
        },
        select: {
          id: true,
          name: true,
          email: true,
          points: true,
          level: true,
          createdAt: true,
        }
      });
      return user as User;
    }
  }

  async createUser(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        points: true,
        level: true,
        createdAt: true,
      }
    });
    return user as User;
  }

  async getUserByEmail(email: string): Promise<any | null> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "users");
      const q = query(colRef, where("email", "==", email.toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return convertDoc(snap.docs[0]);
    } else {
      return prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    }
  }

  async updateUserPoints(userId: string, points: number, level: number): Promise<{ points: number; level: number }> {
    if (isFirebaseConfigured && db) {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { points, level });
      return { points, level };
    } else {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { points, level },
        select: { points: true, level: true }
      });
      return user;
    }
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "achievements");
      const q = query(colRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      return convertQuery(snap) as Achievement[];
    } else {
      const achievements = await prisma.achievement.findMany({
        where: { userId },
      });
      return achievements as Achievement[];
    }
  }

  async addAchievement(userId: string, title: string, description: string, icon: string): Promise<Achievement> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "achievements");
      const q = query(colRef, where("userId", "==", userId), where("title", "==", title));
      const snap = await getDocs(q);
      if (!snap.empty) return convertDoc(snap.docs[0]) as Achievement;

      const docRef = await addDoc(colRef, {
        userId,
        title,
        description,
        icon,
        unlockedAt: Timestamp.now()
      });
      return { id: docRef.id, userId, title, description, icon, unlockedAt: new Date() } as Achievement;
    } else {
      const existing = await prisma.achievement.findFirst({
        where: { userId, title },
      });
      if (existing) return existing as Achievement;

      const created = await prisma.achievement.create({
        data: {
          userId,
          title,
          description,
          icon,
        },
      });
      return created as Achievement;
    }
  }
}

export const userRepository = new UserRepository();
