import { NextResponse } from "next/server";
import { handleSummarizeRequest } from "@/lib/summarize-handler";
import type { SummarizeResponse } from "@/lib/summarize-handler";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await handleSummarizeRequest(body);
    return NextResponse.json<SummarizeResponse>(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to summarize content.";
    const isValidationError =
      errorMessage === "API key is required" ||
      errorMessage === "Content is required to summarize." ||
      errorMessage.includes("Failed to create model") ||
      errorMessage.includes("API key") ||
      errorMessage.includes("not configured");
    
    // Only log unexpected errors, not validation errors
    if (!isValidationError) {
      console.error("Failed to summarize prompt card content:", error);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
