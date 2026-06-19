import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/services/auth";
import { cookies } from "next/headers";
import { generateCoachingResponse } from "@/services/ai-coach";
import { getLatestAssessment } from "@/services/db-service";
import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

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

    const userId = payload.userId;
    const body = await req.json();
    const validation = chatSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const { message, history } = validation.data;

    // Fetch user's latest assessment using the DB Service
    const latestAssessment = await getLatestAssessment(userId);

    const reply = await generateCoachingResponse(message, latestAssessment, history);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI Coach API error:", error);
    return NextResponse.json({ error: "Coaching failed" }, { status: 500 });
  }
}
