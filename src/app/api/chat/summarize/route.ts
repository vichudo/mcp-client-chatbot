import { convertToCoreMessages, smoothStream, streamText } from "ai";
import { selectThreadWithMessagesAction } from "../actions";
import { customModelProvider } from "lib/ai/models";
import { SUMMARIZE_PROMPT } from "lib/ai/prompts";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { threadId, model: modelName } = json as {
      threadId: string;
      model: string;
    };

    const thread = await selectThreadWithMessagesAction(threadId);

    if (!thread) {
      return new Response("Thread not found", { status: 404 });
    }

    const result = streamText({
      model: customModelProvider.getModel(modelName),
      system: SUMMARIZE_PROMPT,
      experimental_transform: smoothStream({ chunking: "word" }),
      messages: convertToCoreMessages(
        thread.messages.map((v) => ({
          content: "",
          role: v.role,
          parts: v.parts,
        })),
      ),
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error(error);
  }
}
