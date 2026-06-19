import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/proxy";
import { reportService } from "@/services/report.service";
import { handleApiError } from "@/lib/errors";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const reports = await reportService.getWeeklyReports(userId);
    return NextResponse.json({ reports });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const report = await reportService.generateWeeklyReport(userId);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});
