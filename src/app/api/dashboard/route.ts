import { NextResponse } from "next/server";
import { verifyToken } from "@/services/auth";
import { 
  getUserProfile, 
  getLatestAssessment, 
  getAssessmentsHistory, 
  getUserGoals, 
  getUserChallenges, 
  getUserAchievements 
} from "@/services/db-service";
import { cookies } from "next/headers";

export async function GET() {
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

    // 1. Fetch user profile
    const user = await getUserProfile(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Fetch latest assessment
    const latestAssessment = await getLatestAssessment(userId);

    // 3. Fetch assessment history
    const history = await getAssessmentsHistory(userId);
    const assessmentsHistory = history.slice(-6); // Take up to 6 records for line charts

    // 4. Fetch goals stats
    const goalsList = await getUserGoals(userId);
    const activeGoals = goalsList.filter((g: any) => g.status === "ACTIVE");
    const completedGoalsCount = goalsList.filter((g: any) => g.status === "COMPLETED").length;

    // 5. Fetch challenges stats
    const challengesList = await getUserChallenges(userId);
    const joinedChallenges = challengesList.filter((uc: any) => uc.status === "JOINED");
    const completedChallengesCount = challengesList.filter((uc: any) => uc.status === "COMPLETED").length;

    // 6. Fetch achievements
    const achievements = await getUserAchievements(userId);
    achievements.sort((a: any, b: any) => b.unlockedAt.getTime() - a.unlockedAt.getTime());

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
    console.error("Dashboard api error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
