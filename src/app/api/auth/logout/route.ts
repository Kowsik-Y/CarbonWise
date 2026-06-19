import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleApiError } from "@/lib/errors";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.set({
      name: "token",
      value: "",
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
