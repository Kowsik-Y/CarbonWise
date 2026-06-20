import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/proxy";
import { 
  getUserProfile, 
  getLatestAssessment, 
  getAssessmentsHistory, 
  getUserGoals, 
  getUserChallenges, 
  getUserAchievements 
} from "@/services/db-service";
import { Goal, UserChallenge, Achievement } from "@/types";
import { handleApiError, NotFoundError } from "@/lib/errors";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {

    // 1. Fetch user profile
    const user = await getUserProfile(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // 2-6. Fetch independent data concurrently
    const [
      latestAssessment,
      history,
      goalsList,
      challengesList,
      achievements,
    ] = await Promise.all([
      getLatestAssessment(userId),
      getAssessmentsHistory(userId),
      getUserGoals(userId),
      getUserChallenges(userId),
      getUserAchievements(userId),
    ]);

    const assessmentsHistory = history.slice(-6); // Take up to 6 records for line charts

    // 4. Fetch goals stats
    const activeGoals = goalsList.filter((g: Goal) => g.status === "ACTIVE");
    const completedGoalsCount = goalsList.filter((g: Goal) => g.status === "COMPLETED").length;

    // 5. Fetch challenges stats
    const joinedChallenges = challengesList.filter((uc: UserChallenge) => uc.status === "JOINED");
    const completedChallengesCount = challengesList.filter((uc: UserChallenge) => uc.status === "COMPLETED").length;

    // 6. Fetch achievements
    achievements.sort((a: Achievement, b: Achievement) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());

    return NextResponse.json({
      user,
      latestAssessment,
      assessmentsHistory,
      goals: {
        active: activeGoals,
        completedCount: completedGoalsCount,
      },
      challenges: {
        activeCount: joinedChallenges.length,
        completedCount: completedChallengesCount,
      },
      achievements,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

