import { NextResponse } from "next/server";
import { getPatentDetail } from "@/lib/patent-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const response = await getPatentDetail(id);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "상세 조회 중 오류가 발생했습니다." },
      { status: 404 },
    );
  }
}
