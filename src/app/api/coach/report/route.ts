import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/proxy";
import { generateEvaluationReport } from "@/services/ai-coach";
import { 
  getLatestAssessment, 
  getUserGoals, 
  getUserChallenges 
} from "@/services/db-service";
import { Goal, UserChallenge } from "@/types";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    // Fetch assessment, goals, and challenges status using the DB Service
    const latestAssessment = await getLatestAssessment(userId);

    const goalsList = await getUserGoals(userId);
    const activeGoalsCount = goalsList.filter((g: Goal) => g.status === "ACTIVE").length;
    const completedGoalsCount = goalsList.filter((g: Goal) => g.status === "COMPLETED").length;

    const challengesList = await getUserChallenges(userId);
    const completedChallengesCount = challengesList.filter((uc: UserChallenge) => uc.status === "COMPLETED").length;

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
});
