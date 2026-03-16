import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "Logout berhasil" },
    { status: 200 }
  );

  // Clear the session cookie
  response.cookies.delete("tempest_session");

  return response;
}
