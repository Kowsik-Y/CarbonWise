import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/proxy";
import { generateEvaluationReport } from "@/services/ai-coach";
import { 
  getLatestAssessment, 
  getUserGoals, 
  getUserChallenges 
} from "@/services/db-service";
import { Goal, UserChallenge } from "@/types";
import { handleApiError } from "@/lib/errors";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    // Fetch assessment, goals, and challenges status using the DB Service
    const [latestAssessment, goalsList, challengesList] = await Promise.all([
      getLatestAssessment(userId),
      getUserGoals(userId),
      getUserChallenges(userId),
    ]);

    const activeGoalsCount = goalsList.filter((g: Goal) => g.status === "ACTIVE").length;
    const completedGoalsCount = goalsList.filter((g: Goal) => g.status === "COMPLETED").length;

    const completedChallengesCount = challengesList.filter((uc: UserChallenge) => uc.status === "COMPLETED").length;

    const report = await generateEvaluationReport(
      latestAssessment,
      activeGoalsCount,
      completedGoalsCount,
      completedChallengesCount
    );

    return NextResponse.json({ report });
  } catch (error) {
    return handleApiError(error);
  }
});

