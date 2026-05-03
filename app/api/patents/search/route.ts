import { NextRequest, NextResponse } from "next/server";
import { searchPatents } from "@/lib/patent-service";
import { normalizeSearchParams } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const params = normalizeSearchParams(request.nextUrl.searchParams);
    const response = await searchPatents(params);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "검색 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
