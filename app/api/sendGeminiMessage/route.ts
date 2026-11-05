import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { clientSupabase } from "@/app/lib/supabase/client";

const apiKey = process.env.GEMINI_API_KEY;

interface Part {
  text: string;
}

export async function POST(request: NextRequest) {
  // ログインしている人だけに Gemini を使わせる
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const { data } = token
    ? await clientSupabase.auth.getUser(token)
    : { data: { user: null } };
  if (!data.user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "メッセージが提供されていません。" }, { status: 400 });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        contents: [{ parts: [{ text: message }] }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
      }
    );

    const responseData = response.data;
    if (
      !responseData ||
      !responseData.candidates ||
      responseData.candidates.length === 0 ||
      !responseData.candidates[0].content ||
      !responseData.candidates[0].content.parts
    ) {
      throw new Error("応答データが有効ではありません。");
    }

    const messageContent = responseData.candidates[0].content.parts
      .map((part: Part) => part.text)
      .join("\n");

    return NextResponse.json({ content: messageContent });
  } catch (error) {
    console.error("Gemini APIエラー:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "API呼び出しに失敗しました。" }, { status: 500 });
  }
}
