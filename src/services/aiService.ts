
import { apiClient } from "@/api";

import type {
  AIChatRequest,
  AIChatResponse,
  AIChatHistoryResponse,
} from "@/types/ai";

const GEMINI_CHAT_URL = "http://127.0.0.1:8003/api/ai/chat";

type GeminiChatResponse = {
  response: string;
  provider: string;
};

export async function sendAIMessage(
  request: AIChatRequest
): Promise<AIChatResponse> {
  try {
    const result = await fetch(GEMINI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        message: request.message,
        history: [],
      }),
    });

    if (!result.ok) {
      let detail = "Twin AI is temporarily unavailable.";

      try {
        const errorData = await result.json();
        detail = errorData.detail || detail;
      } catch {
        // Keep the default error message.
      }

      throw new Error(detail);
    }

    const data: GeminiChatResponse = await result.json();

    if (!data.response?.trim()) {
      throw new Error("Gemini returned an empty response.");
    }

    return {
      conversationId:
        request.conversationId || `gemini-${Date.now()}`,
      message: {
        id: `message-${Date.now()}`,
        role: "assistant",
        text: data.response,
        createdAt: new Date().toISOString(),
      },
      insight: undefined,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Twin AI is temporarily unavailable.");
  }
}

export async function getAIChatHistory(): Promise<AIChatHistoryResponse> {
  // Gemini chat is connected, but persistent conversation history
  // has not yet been implemented for the new endpoint.
  return {
    conversations: [],
  };
}
