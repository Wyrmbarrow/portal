import { NextRequest, NextResponse } from "next/server";
import { checkLLMRateLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";

/**
 * Example LLM API route with rate limiting.
 * Replace the LLM call with your actual streamText/generateText logic.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check rate limit
  const { allowed, remaining, resetAt } = checkLLMRateLimit(session.user.email);

  if (!allowed) {
    const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        resetAt: new Date(resetAt).toISOString(),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  // Your LLM call here (example below)
  // const result = await streamText({
  //   model: "anthropic/claude-sonnet-4.6",
  //   messages: [...],
  // });
  // return result.toDataStreamResponse();

  // Mock response for testing
  return NextResponse.json(
    { message: "LLM call successful" },
    {
      headers: {
        "X-RateLimit-Remaining": String(remaining),
      },
    },
  );
}
