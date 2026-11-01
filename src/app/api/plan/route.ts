/**
 * POST /api/plan
 * Server-side route handler for synthesizing validated event plans with Google Gemini.
 */

import { NextResponse } from "next/server";
import { API_LIMITS } from "@/lib/constants/limits";
import { eventDetailsSchema } from "@/lib/schemas/event";
import { getClientIdentifier, planApiRateLimiter } from "@/lib/security/rateLimiter";
import { GeminiError, synthesizeEventPlan } from "@/lib/ai";

export async function POST(request: Request): Promise<Response> {
  // 1. Enforce payload size limit from Content-Length header if present
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

  // Double-check byte length of actual text
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
          message: "Rate limit exceeded. Please wait before generating another plan.",
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

  // 5. Strict Zod validation of input BEFORE making any Gemini request
  const validationResult = eventDetailsSchema.safeParse(jsonBody);
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
          message: "Event details failed schema validation.",
          details,
        },
      },
      { status: 400 }
    );
  }

  // 6. Call Gemini synthesis and deterministic recalculation
  try {
    const plan = await synthesizeEventPlan(validationResult.data);

    return NextResponse.json(
      {
        success: true,
        data: plan,
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
          message: "An unexpected error occurred while generating your event plan.",
        },
      },
      { status: 500 }
    );
  }
}

