import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/proxy";
import { WEEKLY_CHALLENGES } from "@/utils/challenges-list";
import { 
  getUserChallenges, 
  joinChallenge, 
  completeChallenge, 
  getUserProfile, 
  updateUserPoints, 
  addAchievement,
  getLatestAssessment
} from "@/services/db-service";
import { generateDynamicChallenges } from "@/services/ai-coach";
import { z } from "zod";

const joinChallengeSchema = z.object({
  challengeCode: z.string(),
});

const completeChallengeSchema = z.object({
  id: z.string(),
});

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {

    // Fetch user joined challenges
    const userChallenges = await getUserChallenges(userId);

    // Fetch user latest assessment to generate custom AI challenges
    const assessment = await getLatestAssessment(userId);
    let dynamicChallenges: any[] = [];
    if (assessment) {
      dynamicChallenges = await generateDynamicChallenges(assessment);
    }

    // Combine standard challenges with custom dynamic AI challenges
    const combinedChallenges = [...WEEKLY_CHALLENGES, ...dynamicChallenges];

    return NextResponse.json({
      challenges: combinedChallenges,
      userChallenges,
    });
  } catch (error) {
    console.error("Fetch challenges error:", error);
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const validation = joinChallengeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { challengeCode } = validation.data;

    // Verify challenge exists in catalog (or starts with "ai-" indicating dynamic AI challenge)
    const assessment = await getLatestAssessment(userId);
    const dynamicChallenges = assessment ? await generateDynamicChallenges(assessment) : [];
    const combinedCatalog = [...WEEKLY_CHALLENGES, ...dynamicChallenges];

    const challengeExists = combinedCatalog.some((c) => c.code === challengeCode);
    if (!challengeExists) {
      return NextResponse.json({ error: "Challenge not found in catalog" }, { status: 404 });
    }

    // Join challenge using db-service (it automatically checks for duplicates)
    try {
      const userChallenge = await joinChallenge(userId, challengeCode);
      return NextResponse.json({ userChallenge }, { status: 201 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Failed to join challenge" }, { status: 400 });
    }
  } catch (error) {
    console.error("Join challenge error:", error);
    return NextResponse.json({ error: "Failed to join challenge" }, { status: 500 });
  }
});

export const PATCH = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const validation = completeChallengeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { id } = validation.data;

    // Fetch dynamic catalog to compute points
    const assessment = await getLatestAssessment(userId);
    const dynamicChallenges = assessment ? await generateDynamicChallenges(assessment) : [];
    const combinedCatalog = [...WEEKLY_CHALLENGES, ...dynamicChallenges];

    // Find the enrollment
    const userChallenges = await getUserChallenges(userId);
    const enrollment = userChallenges.find((uc: any) => uc.id === id && uc.status === "JOINED");

    if (!enrollment) {
      return NextResponse.json({ error: "Challenge enrollment not found or already completed" }, { status: 404 });
    }

    const catalogChallenge = combinedCatalog.find((c) => c.code === enrollment.challengeCode);
    if (!catalogChallenge) {
      return NextResponse.json({ error: "Challenge catalog entry missing" }, { status: 404 });
    }

    // Complete using db-service
    const updated = await completeChallenge(userId, id);

    // Award points
    const pointsAwarded = catalogChallenge.points;
    const user = await getUserProfile(userId);

    if (user) {
      const newPoints = user.points + pointsAwarded;
      let newLevel = user.level;
      if (newPoints >= 1000) newLevel = 4;
      else if (newPoints >= 500) newLevel = 3;
      else if (newPoints >= 200) newLevel = 2;

      await updateUserPoints(userId, newPoints, newLevel);

      // Unlock achievements
      const listAfterUpdate = await getUserChallenges(userId);
      const completedChallengesCount = listAfterUpdate.filter((uc: any) => uc.status === "COMPLETED").length;

      if (completedChallengesCount === 1) {
        await addAchievement(userId, "Challenger", "Completed your first weekly challenge", "zap");
      } else if (completedChallengesCount === 3) {
        await addAchievement(userId, "Eco Champion", "Completed 3 weekly challenges", "shield");
      }
    }

    return NextResponse.json({ userChallenge: updated, pointsAwarded });
  } catch (error) {
    console.error("Complete challenge error:", error);
    return NextResponse.json({ error: "Failed to complete challenge" }, { status: 500 });
  }
});
