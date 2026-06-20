import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/proxy";
import { generateCoachingResponse } from "@/services/ai-coach";
import { getLatestAssessment } from "@/services/db-service";
import { z } from "zod";
import { handleApiError, ValidationError } from "@/lib/errors";

const chatSchema = z.object({
  message: z.string().min(1).max(3000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const validation = chatSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError("Invalid query parameters");
    }

    const { message, history } = validation.data;

    // Fetch user's latest assessment using the DB Service
    const latestAssessment = await getLatestAssessment(userId);

    const reply = await generateCoachingResponse(message, latestAssessment, history);

    return NextResponse.json({ reply });
  } catch (error) {
    return handleApiError(error);
  }
});
