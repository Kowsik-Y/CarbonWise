import { NextRequest, NextResponse } from "next/server";
import { parseAssessmentFromText } from "@/services/ai-coach";
import { withAuth } from "@/lib/proxy";
import { handleApiError, ValidationError } from "@/lib/errors";
import { z } from "zod";

const parseAssessmentSchema = z.object({ text: z.string().min(1).max(3000) });

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validation = parseAssessmentSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError("Invalid query parameters");
    }

    const { text } = validation.data;

    const parsedValues = await parseAssessmentFromText(text);
    return NextResponse.json({ values: parsedValues });
  } catch (error) {
    return handleApiError(error);
  }
});
