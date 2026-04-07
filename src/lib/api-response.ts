import { NextResponse } from "next/server";
import { ApiResponse } from "@/types";

export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse<T = any>(error: string, status = 400): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: false, error }, { status });
}
