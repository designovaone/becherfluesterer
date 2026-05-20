import { NextResponse, type NextRequest } from "next/server";
import { clearAllSessions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await clearAllSessions();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
