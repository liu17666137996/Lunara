import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Returns the session user id, or a 401 NextResponse to short-circuit the route. */
export async function requireUserId(): Promise<string | NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return userId;
}
