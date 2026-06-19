import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/proxy";
import { reportService } from "@/services/report.service";
import { handleApiError, NotFoundError } from "@/lib/errors";

export const GET = withAuth(async (req: NextRequest, { userId, params }) => {
  try {
    const id = params?.id;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing report ID" }, { status: 400 });
    }
    
    const report = await reportService.getWeeklyReportById(userId, id);
    if (!report) {
      throw new NotFoundError("Weekly report not found");
    }
    
    return NextResponse.json({ report });
  } catch (error) {
    return handleApiError(error);
  }
});
