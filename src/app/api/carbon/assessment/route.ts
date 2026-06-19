import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/proxy";
import { calculateCarbonFootprint } from "@/utils/carbon-calculator";
import { 
  getLatestAssessment, 
  getAssessmentsHistory, 
  saveAssessment, 
  getUserProfile, 
  updateUserPoints, 
  addAchievement,
  deleteAssessments
} from "@/services/db-service";
import { z } from "zod";
import { CarbonAssessment } from "@/types";

const assessmentSchema = z.object({
  transportKm: z.number().min(0),
  transportType: z.string(),
  electricityBill: z.number().min(0),
  electricityKwh: z.number().min(0),
  foodHabits: z.string(),
  shoppingHabits: z.string(),
  wasteHabits: z.string(),
});

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const assessment = await getLatestAssessment(userId);

    return NextResponse.json({ assessment });
  } catch (error) {
    console.error("Fetch assessment error:", error);
    return NextResponse.json({ error: "Failed to fetch assessment" }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const validation = assessmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid assessment data" }, { status: 400 });
    }

    const inputData = validation.data;

    // Calculate footprint metrics
    const results = calculateCarbonFootprint(inputData);

    // Save assessment to DB
    const assessment = await saveAssessment(userId, {
      transportKm: inputData.transportKm,
      transportType: inputData.transportType,
      electricityBill: inputData.electricityBill,
      electricityKwh: inputData.electricityKwh,
      foodHabits: inputData.foodHabits,
      shoppingHabits: inputData.shoppingHabits,
      wasteHabits: inputData.wasteHabits,
      transportEmissions: results.transportEmissions,
      energyEmissions: results.energyEmissions,
      foodEmissions: results.foodEmissions,
      shoppingEmissions: results.shoppingEmissions,
      wasteEmissions: results.wasteEmissions,
      monthlyFootprint: results.monthlyFootprint,
      annualFootprint: results.annualFootprint,
      carbonScore: results.carbonScore,
    });

    // Check if it's user's first assessment to award bonus points
    const history = await getAssessmentsHistory(userId);
    const previousAssessmentsCount = history.filter((a: CarbonAssessment) => a.id !== assessment.id).length;

    let pointsAwarded = 0;
    if (previousAssessmentsCount === 0) {
      pointsAwarded = 150; // 150 points for first carbon calculation!
    } else {
      pointsAwarded = 50; // 50 points for updating profile!
    }

    // Update user points and level
    const user = await getUserProfile(userId);
    if (user) {
      const newPoints = user.points + pointsAwarded;
      let newLevel = user.level;
      if (newPoints >= 1000) newLevel = 4;
      else if (newPoints >= 500) newLevel = 3;
      else if (newPoints >= 200) newLevel = 2;

      await updateUserPoints(userId, newPoints, newLevel);

      // Unlock "Carbon Explorer" achievement if first time
      if (previousAssessmentsCount === 0) {
        await addAchievement(userId, "Carbon Pioneer", "Completed your first carbon assessment", "compass");
      }
    }

    return NextResponse.json({
      assessment,
      pointsAwarded,
    });
  } catch (error) {
    console.error("Save assessment error:", error);
    return NextResponse.json({ error: "Failed to save assessment" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, { userId }) => {
  try {

    // Delete all assessments for the user
    await deleteAssessments(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset assessment error:", error);
    return NextResponse.json({ error: "Failed to reset assessments" }, { status: 500 });
  }
});
