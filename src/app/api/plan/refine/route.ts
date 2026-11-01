/**
 * POST /api/plan/refine
 * Server-side route handler for refining an existing celebration plan with Google Gemini.
 */

import { NextResponse } from "next/server";
import { API_LIMITS } from "@/lib/constants/limits";
import { refinePlanRequestSchema } from "@/lib/schemas/refine";
import { getClientIdentifier, planApiRateLimiter } from "@/lib/security/rateLimiter";
import { GeminiError, refineEventPlan } from "@/lib/ai";

export async function POST(request: Request): Promise<Response> {
  // 1. Enforce payload size limit from Content-Length header
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader && Number(contentLengthHeader) > API_LIMITS.MAX_REQUEST_BODY_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: `Request body exceeds the maximum allowed size of ${API_LIMITS.MAX_REQUEST_BODY_BYTES / 1024} KB.`,
        },
      },
      { status: 413 }
    );
  }

  // 2. Read request body text safely
  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Unable to read request payload.",
        },
      },
      { status: 400 }
    );
  }

  if (new TextEncoder().encode(rawText).length > API_LIMITS.MAX_REQUEST_BODY_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: `Request body exceeds the maximum allowed size of ${API_LIMITS.MAX_REQUEST_BODY_BYTES / 1024} KB.`,
        },
      },
      { status: 413 }
    );
  }

  // 3. Parse JSON safely
  let jsonBody: unknown;
  try {
    jsonBody = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MALFORMED_JSON",
          message: "Request body contains malformed JSON.",
        },
      },
      { status: 400 }
    );
  }

  // 4. In-memory Rate Limiting
  const clientIdentifier = getClientIdentifier(request);
  const rateLimitResult = planApiRateLimiter.check(clientIdentifier);
  if (!rateLimitResult.allowed) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded. Please wait before submitting another refinement.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
        },
      }
    );
  }

  // 5. Strict Zod validation of input plan and refinement instructions
  const validationResult = refinePlanRequestSchema.safeParse(jsonBody);
  if (!validationResult.success) {
    const details = validationResult.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Refinement request failed schema validation.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const { plan, instructions, targetSection } = validationResult.data;

  // 6. Call Gemini refinement orchestration and deterministic recalculation
  try {
    const refinedPlan = await refineEventPlan(plan, instructions, targetSection);

    return NextResponse.json(
      {
        success: true,
        data: refinedPlan,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof GeminiError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status }
      );
    }

    // Never leak stack traces or provider internals to the client
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while refining your event plan.",
        },
      },
      { status: 500 }
    );
  }
}

