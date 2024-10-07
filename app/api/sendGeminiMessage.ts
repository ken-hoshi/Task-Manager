import axios from "axios";

const apiKey = process.env.GEMINI_API_KEY;

interface Part {
  text: string;
}

export const sendGeminiMessage = async (message: string) => {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
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

    return messageContent;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
