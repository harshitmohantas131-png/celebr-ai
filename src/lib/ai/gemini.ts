/**
 * Server-only Google Gemini AI Client Wrapper for CelebrAI.
 * Encapsulates official @google/genai SDK interactions, timeout control, and error normalization.
 *
 * DO NOT import this module on the client side.
 */

import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "@/lib/constants/limits";
import type { EventDetails, EventPlan, PlanSection } from "@/types/event";
import {
  buildEventPlanPrompt,
  buildRefinePlanPrompt,
  CELEBRAI_SYSTEM_INSTRUCTION,
  GEMINI_PLAN_RESPONSE_SCHEMA,
} from "./prompts";

// Ensure this module is never bundled into browser client environments
if (
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  !process.env.VITEST &&
  !process.versions?.node
) {
  throw new Error("The Gemini AI service module can only be executed on the server.");
}

export class GeminiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status = 500) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
    this.status = status;
  }
}

export class GeminiConfigurationError extends GeminiError {
  constructor(
    message = "Gemini API key is not configured. Set GEMINI_API_KEY in your server environment."
  ) {
    super(message, "CONFIGURATION_ERROR", 503);
    this.name = "GeminiConfigurationError";
  }
}

export class GeminiTimeoutError extends GeminiError {
  constructor(message = "Event plan generation request timed out.") {
    super(message, "TIMEOUT_ERROR", 504);
    this.name = "GeminiTimeoutError";
  }
}

export class GeminiProviderError extends GeminiError {
  constructor(message = "Gemini AI provider encountered an error.") {
    super(message, "PROVIDER_ERROR", 502);
    this.name = "GeminiProviderError";
  }
}

export class GeminiResponseParsingError extends GeminiError {
  constructor(message = "Model generated malformed or empty output.") {
    super(message, "INVALID_MODEL_OUTPUT", 502);
    this.name = "GeminiResponseParsingError";
  }
}

/**
 * Sanitizes external error messages to prevent leaking credentials or internal URLs.
 */
export function sanitizeErrorMessage(rawMessage: string): string {
  return rawMessage
    .replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_API_KEY]")
    .replace(/https?:\/\/[^\s]+/g, "[REDACTED_URL]")
    .slice(0, 200);
}

/**
 * Returns a configured GoogleGenAI instance using the server's environment variable.
 * Throws GeminiConfigurationError if the key is missing or blank.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiConfigurationError();
  }
  return new GoogleGenAI({ apiKey });
}

export interface GeneratePlanOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  model?: string;
  client?: GoogleGenAI;
}

/**
 * Sends a structured prompt to Gemini and parses the resulting JSON.
 * Pure server-side function, separate from HTTP route handlers for modular testing.
 */
export async function generateRawPlan(
  details: EventDetails,
  options?: GeneratePlanOptions
): Promise<unknown> {
  const client = options?.client ?? getGeminiClient();
  const model = options?.model ?? process.env.GEMINI_MODEL ?? AI_CONFIG.DEFAULT_MODEL;
  const timeoutMs = options?.timeoutMs ?? AI_CONFIG.GENERATION_TIMEOUT_MS;

  const prompt = buildEventPlanPrompt(details);

  // Set up bounded timeout signal
  const abortSignal = options?.signal ?? AbortSignal.timeout(timeoutMs);

  try {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: CELEBRAI_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: GEMINI_PLAN_RESPONSE_SCHEMA,
        temperature: AI_CONFIG.TEMPERATURE,
        maxOutputTokens: AI_CONFIG.MAX_OUTPUT_TOKENS,
        abortSignal,
      },
    });

    const text = response.text;
    if (!text || !text.trim()) {
      throw new GeminiResponseParsingError("Model generated an empty response.");
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new GeminiResponseParsingError("Model output failed JSON parsing.");
    }
  } catch (error: unknown) {
    if (error instanceof GeminiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        throw new GeminiTimeoutError();
      }

      const lower = error.message.toLowerCase();
      if (lower.includes("429") || lower.includes("resource_exhausted")) {
        throw new GeminiError(
          "Gemini rate limit exceeded. Please wait and try again.",
          "RATE_LIMIT_EXCEEDED",
          429
        );
      }

      throw new GeminiProviderError(
        `AI provider error: ${sanitizeErrorMessage(error.message)}`
      );
    }

    throw new GeminiProviderError("An unexpected error occurred during AI generation.");
  }
}

/**
 * Sends an iterative refinement prompt to Gemini with previous plan context and user feedback.
 */
export async function generateRawRefinement(
  plan: EventPlan,
  instructions: string,
  targetSection?: PlanSection,
  options?: GeneratePlanOptions
): Promise<unknown> {
  const client = options?.client ?? getGeminiClient();
  const model = options?.model ?? process.env.GEMINI_MODEL ?? AI_CONFIG.DEFAULT_MODEL;
  const timeoutMs = options?.timeoutMs ?? AI_CONFIG.GENERATION_TIMEOUT_MS;

  const prompt = buildRefinePlanPrompt(plan, instructions, targetSection);
  const abortSignal = options?.signal ?? AbortSignal.timeout(timeoutMs);

  try {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: CELEBRAI_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: GEMINI_PLAN_RESPONSE_SCHEMA,
        temperature: AI_CONFIG.TEMPERATURE,
        maxOutputTokens: AI_CONFIG.MAX_OUTPUT_TOKENS,
        abortSignal,
      },
    });

    const text = response.text;
    if (!text || !text.trim()) {
      throw new GeminiResponseParsingError("Model generated an empty refinement response.");
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new GeminiResponseParsingError("Model refinement output failed JSON parsing.");
    }
  } catch (error: unknown) {
    if (error instanceof GeminiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        throw new GeminiTimeoutError("Plan refinement request timed out.");
      }

      const lower = error.message.toLowerCase();
      if (lower.includes("429") || lower.includes("resource_exhausted")) {
        throw new GeminiError(
          "Gemini rate limit exceeded during refinement. Please wait and try again.",
          "RATE_LIMIT_EXCEEDED",
          429
        );
      }

      throw new GeminiProviderError(
        `AI refinement error: ${sanitizeErrorMessage(error.message)}`
      );
    }

    throw new GeminiProviderError("An unexpected error occurred during AI refinement.");
  }
}
