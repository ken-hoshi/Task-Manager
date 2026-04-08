import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;

interface Part {
  text: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "メッセージが提供されていません。" }, { status: 400 });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: message }] }],
      },
      {
        headers: {
          "Content-Type": "application/json",
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
    console.error("Gemini APIエラー:", error);
    return NextResponse.json({ error: "API呼び出しに失敗しました。" }, { status: 500 });
  }
}
