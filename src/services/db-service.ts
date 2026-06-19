import { prisma } from "@/lib/db";
import { isFirebaseConfigured, db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  addDoc,
  Timestamp
} from "firebase/firestore";

function convertDoc(docSnap: any) {
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  const result: any = { id: docSnap.id, ...data };
  
  // Convert Firestore Timestamp fields to Date objects
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

export async function getUserProfile(userId: string) {
  if (isFirebaseConfigured && db) {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    return convertDoc(snap);
  } else {
    return prisma.user.findUnique({
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
  }
}

export async function createUserProfile(userId: string, data: { name: string; email: string }) {
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
    return { id: userId, ...profile, createdAt: new Date() };
  } else {
    return null;
  }
}

export async function updateUserPoints(userId: string, points: number, level: number) {
  if (isFirebaseConfigured && db) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { points, level });
    return { points, level };
  } else {
    return prisma.user.update({
      where: { id: userId },
      data: { points, level },
    });
  }
}

export async function getLatestAssessment(userId: string) {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, "assessments");
    const q = query(colRef, where("userId", "==", userId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const list = convertQuery(snap);
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list[0];
  } else {
    return prisma.carbonAssessment.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export async function getAssessmentsHistory(userId: string) {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, "assessments");
    const q = query(colRef, where("userId", "==", userId));
    const snap = await getDocs(q);
    const list = convertQuery(snap);
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return list;
  } else {
    return prisma.carbonAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }
}

export async function saveAssessment(userId: string, data: any) {
  if (isFirebaseConfigured && db) {
    const assessmentRef = collection(db, "assessments");
    const docRef = await addDoc(assessmentRef, {
      userId,
      ...data,
      createdAt: Timestamp.now()
    });
    return { id: docRef.id, userId, ...data, createdAt: new Date() };
  } else {
    return prisma.carbonAssessment.create({
      data: {
        userId,
        ...data,
      }
    });
  }
}

export async function getUserGoals(userId: string) {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, "goals");
    const q = query(colRef, where("userId", "==", userId));
    const snap = await getDocs(q);
    const list = convertQuery(snap);
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list;
  } else {
    return prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export async function addGoal(userId: string, data: { title: string; category: string; co2Reduction: number; difficulty: string }) {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, "goals");
    const docRef = await addDoc(colRef, {
      userId,
      ...data,
      status: "ACTIVE",
      createdAt: Timestamp.now()
    });
    return { id: docRef.id, userId, ...data, status: "ACTIVE", createdAt: new Date() };
  } else {
    return prisma.goal.create({
      data: {
        userId,
        title: data.title,
        category: data.category,
        co2Reduction: data.co2Reduction,
        difficulty: data.difficulty,
        status: "ACTIVE",
      }
    });
  }
}

export async function updateGoal(userId: string, goalId: string, status: "ACTIVE" | "COMPLETED") {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, "goals", goalId);
    const updateData: any = { status };
    if (status === "COMPLETED") {
      updateData.completedAt = Timestamp.now();
    }
    await updateDoc(docRef, updateData);
    const updatedSnap = await getDoc(docRef);
    return convertDoc(updatedSnap);
  } else {
    return prisma.goal.update({
      where: { id: goalId, userId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      }
    });
  }
}

export async function getUserChallenges(userId: string) {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, "userChallenges");
    const q = query(colRef, where("userId", "==", userId));
    const snap = await getDocs(q);
    return convertQuery(snap);
  } else {
    return prisma.userChallenge.findMany({
      where: { userId },
    });
  }
}

export async function joinChallenge(userId: string, challengeCode: string) {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, "userChallenges");
    const docRef = await addDoc(colRef, {
      userId,
      challengeCode,
      status: "JOINED",
      joinedAt: Timestamp.now()
    });
    return { id: docRef.id, userId, challengeCode, status: "JOINED", joinedAt: new Date() };
  } else {
    return prisma.userChallenge.create({
      data: {
        userId,
        challengeCode,
        status: "JOINED",
      },
    });
  }
}

export async function completeChallenge(userId: string, enrollmentId: string) {
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
    return convertDoc(updatedSnap);
  } else {
    const userChallenge = await prisma.userChallenge.findFirst({
      where: { id: enrollmentId, userId, status: "JOINED" },
    });
    if (!userChallenge) {
      throw new Error("Challenge enrollment not found or already completed");
    }
    return prisma.userChallenge.update({
      where: { id: enrollmentId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }
}

export async function getUserAchievements(userId: string) {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, "achievements");
    const q = query(colRef, where("userId", "==", userId));
    const snap = await getDocs(q);
    return convertQuery(snap);
  } else {
    return prisma.achievement.findMany({
      where: { userId },
    });
  }
}

export async function addAchievement(userId: string, title: string, description: string, icon: string) {
  if (isFirebaseConfigured && db) {
    const colRef = collection(db, "achievements");
    // Avoid duplicate unlocks
    const q = query(colRef, where("userId", "==", userId), where("title", "==", title));
    const snap = await getDocs(q);
    if (!snap.empty) return convertDoc(snap.docs[0]);

    const docRef = await addDoc(colRef, {
      userId,
      title,
      description,
      icon,
      unlockedAt: Timestamp.now()
    });
    return { id: docRef.id, userId, title, description, icon, unlockedAt: new Date() };
  } else {
    const existing = await prisma.achievement.findFirst({
      where: { userId, title },
    });
    if (existing) return existing;

    return prisma.achievement.create({
      data: {
        userId,
        title,
        description,
        icon,
      },
    });
  }
}

export async function deleteAssessments(userId: string) {
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
