import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/proxy";
import { getLatestAssessment } from "@/services/db-service";
import { generateDynamicRecommendations } from "@/services/ai-coach";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const assessment = await getLatestAssessment(userId);
    const recommendations = await generateDynamicRecommendations(assessment);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Goals recommendations API error:", error);
    return NextResponse.json({ error: "Failed to load recommendations" }, { status: 500 });
  }
});
