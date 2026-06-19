import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/services/auth";
import { cookies } from "next/headers";
import { generateEvaluationReport } from "@/services/ai-coach";
import { 
  getLatestAssessment, 
  getUserGoals, 
  getUserChallenges 
} from "@/services/db-service";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.userId;

    // Fetch assessment, goals, and challenges status using the DB Service
    const latestAssessment = await getLatestAssessment(userId);

    const goalsList = await getUserGoals(userId);
    const activeGoalsCount = goalsList.filter((g: any) => g.status === "ACTIVE").length;
    const completedGoalsCount = goalsList.filter((g: any) => g.status === "COMPLETED").length;

    const challengesList = await getUserChallenges(userId);
    const completedChallengesCount = challengesList.filter((uc: any) => uc.status === "COMPLETED").length;

    const report = await generateEvaluationReport(
      latestAssessment,
      activeGoalsCount,
      completedGoalsCount,
      completedChallengesCount
    );

    return NextResponse.json({ report });
  } catch (error) {
    console.error("AI Coach Evaluation Report API error:", error);
    return NextResponse.json({ error: "Failed to generate evaluation report" }, { status: 500 });
  }
}
