import { NextRequest, NextResponse } from "next/server";
import { parseAssessmentFromText } from "@/services/ai-coach";
import { verifyToken } from "@/services/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text prompt is required" }, { status: 400 });
    }

    const parsedValues = await parseAssessmentFromText(text);
    return NextResponse.json({ values: parsedValues });
  } catch (error) {
    console.error("AI parse assessment API error:", error);
    return NextResponse.json({ error: "Failed to parse assessment details" }, { status: 500 });
  }
}
