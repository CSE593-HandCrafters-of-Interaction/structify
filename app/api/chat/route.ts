import { handleChatRequest } from "@/lib/chat-handler";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return await handleChatRequest(body);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to handle chat request";
    const isApiKeyError = 
      errorMessage === "API key is required" || 
      errorMessage.includes("API key") || 
      errorMessage.includes("not configured");
    
    // Only log unexpected errors, not validation errors
    if (!isApiKeyError) {
      console.error("Failed to handle chat request:", error);
    }
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      { status: isApiKeyError ? 400 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
