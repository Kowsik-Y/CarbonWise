import { NextRequest, NextResponse } from "next/server";
import { parseAssessmentFromText } from "@/services/ai-coach";
import { withAuth } from "@/lib/proxy";

export const POST = withAuth(async (req: NextRequest) => {
  try {
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
});
