import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/** Returns the session user id, or a 401 NextResponse to short-circuit the route. */
export async function requireUserId(): Promise<string | NextResponse> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return userId;
}
