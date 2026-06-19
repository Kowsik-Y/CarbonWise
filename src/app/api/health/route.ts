import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isFirebaseConfigured, db } from "@/lib/firebase";
import { logger } from "@/lib/logger";

export async function GET() {
  let dbStatus = "disconnected";

  try {
    if (isFirebaseConfigured && db) {
      // Firebase is initialized
      dbStatus = "connected";
    } else {
      // Check Prisma connection
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    }
  } catch (error) {
    logger.error("Healthcheck database connection error", error);
    dbStatus = "disconnected";
  }

  const isHealthy = dbStatus === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
    { status: isHealthy ? 200 : 500 }
  );
}
export const dynamic = "force-dynamic";
export const revalidate = 0;
