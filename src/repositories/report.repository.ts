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
  Timestamp 
} from "firebase/firestore";
import { WeeklyReport } from "@/types";

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

export class ReportRepository {
  async getWeeklyReports(userId: string): Promise<WeeklyReport[]> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "weeklyReports");
      const q = query(colRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      const list = convertQuery(snap);
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list as WeeklyReport[];
    } else {
      const reports = await prisma.weeklyReport.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return reports as unknown as WeeklyReport[];
    }
  }

  async getWeeklyReportById(userId: string, reportId: string): Promise<WeeklyReport | null> {
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, "weeklyReports", reportId);
      const snap = await getDoc(docRef);
      const report = convertDoc(snap);
      if (report && report.userId === userId) {
        return report as WeeklyReport;
      }
      return null;
    } else {
      const report = await prisma.weeklyReport.findUnique({
        where: { id: reportId },
      });
      if (report && report.userId === userId) {
        return report as unknown as WeeklyReport;
      }
      return null;
    }
  }

  async saveWeeklyReport(
    userId: string, 
    data: Omit<WeeklyReport, "id" | "userId" | "createdAt">
  ): Promise<WeeklyReport> {
    if (isFirebaseConfigured && db) {
      const colRef = collection(db, "weeklyReports");
      const docRef = await addDoc(colRef, {
        userId,
        ...data,
        createdAt: Timestamp.now()
      });
      return { id: docRef.id, userId, ...data, createdAt: new Date() } as WeeklyReport;
    } else {
      const created = await prisma.weeklyReport.create({
        data: {
          userId,
          carbonReduction: data.carbonReduction,
          topAccomplishment: data.topAccomplishment,
          missedOpportunities: data.missedOpportunities,
          recommendedActions: data.recommendedActions,
          scoreTrend: data.scoreTrend,
        }
      });
      return created as unknown as WeeklyReport;
    }
  }
}

export const reportRepository = new ReportRepository();
