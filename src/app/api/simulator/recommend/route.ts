import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/proxy";
import { getLatestAssessment } from "@/services/db-service";
import { generateSimulatorOptimization } from "@/services/ai-coach";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const assessment = await getLatestAssessment(userId);
    const recommendation = await generateSimulatorOptimization(assessment);

    return NextResponse.json({ recommendation });
  } catch (error) {
    console.error("Simulator recommendation API error:", error);
    return NextResponse.json({ error: "Failed to load simulator recommendation" }, { status: 500 });
  }
});
