import { NextRequest, NextResponse } from "next/server";
import { parseAssessmentFromText } from "@/services/ai-coach";
import { withAuth } from "@/lib/proxy";
import { handleApiError, ValidationError } from "@/lib/errors";

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      throw new ValidationError("Text prompt is required");
    }

    const parsedValues = await parseAssessmentFromText(text);
    return NextResponse.json({ values: parsedValues });
  } catch (error) {
    return handleApiError(error);
  }
});
