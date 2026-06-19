import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/services/auth";
import { getLatestAssessment } from "@/services/db-service";
import { generateDynamicRecommendations } from "@/services/ai-coach";
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
    const assessment = await getLatestAssessment(userId);
    const recommendations = await generateDynamicRecommendations(assessment);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Goals recommendations API error:", error);
    return NextResponse.json({ error: "Failed to load recommendations" }, { status: 500 });
  }
}
