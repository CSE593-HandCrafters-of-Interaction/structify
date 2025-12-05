import { NextResponse } from "next/server";
import { handleSuggestRequest } from "@/lib/suggest-handler";
import type { SuggestResponse } from "@/lib/suggest-handler";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await handleSuggestRequest(body);
    return NextResponse.json<SuggestResponse>(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to handle suggest request.";
    const isValidationError =
      errorMessage === "API key is required" ||
      errorMessage === "cards is required and must be a non-empty array." ||
      errorMessage.includes("Failed to create model") ||
      errorMessage.includes("API key") ||
      errorMessage.includes("not configured");
    
    // Only log unexpected errors, not validation errors
    if (!isValidationError) {
      console.error("Failed to handle suggest request:", error);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
