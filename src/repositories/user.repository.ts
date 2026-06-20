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
import { convertFirestoreDoc, convertFirestoreQuery } from "@/lib/firestore-utils";

export class UserRepository {
  /**
   * Retrieves a user's profile by their ID.
   * Compiles the profile from Firebase if initialized, otherwise falls back to Prisma.
   * 
   * @param userId - Unique identifier of the user.
   * @returns User profile data or null if not found.
   */
  async getUserProfile(userId: string): Promise<User | null> {
    if (isFirebaseConfigured && db) {
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);
      return convertFirestoreDoc<User>(snap);
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

  /**
   * Creates a new user profile record.
   * 
   * @param userId - Unique identifier for the user.
   * @param data - Name and email details.
   * @returns A promise resolving to the created User object.
   */
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

  /**
   * Creates a new local user with credentials.
   * 
   * @param data - User credentials including password hash.
   * @returns The created User object.
   */
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

  /**
   * Retrieves user profile by email address.
   * 
   * @param email - User email address.
   * @returns User details (including password hash if local user) or null.
   */
  async getUserByEmail(email: string): Promise<(User & { passwordHash?: string }) | null> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "users");
      const q = query(colRef, where("email", "==", email.toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return convertFirestoreDoc<User & { passwordHash?: string }>(snap.docs[0]);
    } else {
      return prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    }
  }

  /**
   * Updates a user's accumulated points and rank level.
   * 
   * @param userId - Unique identifier of the user.
   * @param points - The new points tally.
   * @param level - The user's new rank level.
   * @returns The updated points and level details.
   */
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

  /**
   * Retrieves unlocked achievements for a user.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A list of Achievements.
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "achievements");
      const q = query(colRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      return convertFirestoreQuery<Achievement>(snap);
    } else {
      const achievements = await prisma.achievement.findMany({
        where: { userId },
      });
      return achievements as Achievement[];
    }
  }

  /**
   * Unlocks and saves a new achievement badge for a user.
   * Prevents duplicates if the achievement is already unlocked.
   * 
   * @param userId - Unique identifier of the user.
   * @param title - Title of the achievement badge.
   * @param description - Descriptive details of the achievement.
   * @param icon - SVG or identifier string for the achievement badge icon.
   * @returns The unlocked Achievement detail.
   */
  async addAchievement(userId: string, title: string, description: string, icon: string): Promise<Achievement> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "achievements");
      const q = query(colRef, where("userId", "==", userId), where("title", "==", title));
      const snap = await getDocs(q);
      if (!snap.empty) return convertFirestoreDoc<Achievement>(snap.docs[0]) as Achievement;

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
