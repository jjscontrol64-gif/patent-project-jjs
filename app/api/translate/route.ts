import { NextRequest, NextResponse } from "next/server";
import { translateTextToKorean } from "@/lib/patent-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { text?: string };

    if (!payload.text?.trim()) {
      return NextResponse.json({ message: "번역할 텍스트가 필요합니다." }, { status: 400 });
    }

    const translatedText = await translateTextToKorean(payload.text);
    return NextResponse.json({
      source: "ja",
      target: "ko",
      text: payload.text,
      translatedText,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "번역 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
