import { NextResponse, type NextRequest } from "next/server";
import { clearAllSessions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await clearAllSessions();
  return NextResponse.redirect(new URL("/", req.url));
}
