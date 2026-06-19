import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/services/auth";
import { getLatestAssessment } from "@/services/db-service";
import { generateSimulatorOptimization } from "@/services/ai-coach";
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
    const recommendation = await generateSimulatorOptimization(assessment);

    return NextResponse.json({ recommendation });
  } catch (error) {
    console.error("Simulator recommendation API error:", error);
    return NextResponse.json({ error: "Failed to load simulator recommendation" }, { status: 500 });
  }
}
