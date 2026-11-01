import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { GoogleGenAI } from "@google/genai";
import {
  generateRawPlan,
  getGeminiClient,
  GeminiConfigurationError,
  GeminiResponseParsingError,
  GeminiTimeoutError,
  GeminiProviderError,
  GeminiError,
  sanitizeErrorMessage,
} from "@/lib/ai/gemini";
import { buildEventPlanPrompt } from "@/lib/ai/prompts";
import { DEFAULT_GEMINI_MODEL } from "@/lib/constants/limits";
import type { EventDetails } from "@/types/event";

describe("Gemini AI Client", () => {
  const originalEnv = process.env;

  const sampleEventDetails: EventDetails = {
    name: "Maya & Leo's Vineyard Wedding",
    eventType: "wedding",
    eventDate: "2027-06-15",
    location: "Napa Valley, CA",
    guestCount: 100,
    totalBudget: 35000,
    currency: "USD",
    theme: "Rustic Elegance",
    culturalPreferences: ["Sangeet"],
    dietaryRequirements: ["Vegetarian"],
    planningPriorities: ["Venue", "Music"],
    additionalInstructions: "Include local wine tasting.",
  };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Configuration & Client Initialization", () => {
    it("throws GeminiConfigurationError when GEMINI_API_KEY is missing", () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => getGeminiClient()).toThrow(GeminiConfigurationError);
    });

    it("throws GeminiConfigurationError when GEMINI_API_KEY is empty whitespace", () => {
      process.env.GEMINI_API_KEY = "   ";
      expect(() => getGeminiClient()).toThrow(GeminiConfigurationError);
    });

    it("initializes client successfully when GEMINI_API_KEY is provided", () => {
      process.env.GEMINI_API_KEY = "test-api-key-12345";
      const client = getGeminiClient();
      expect(client).toBeDefined();
    });
  });

  describe("Structured Prompt Formulation", () => {
    it("wraps user event details in untrusted data delimiters", () => {
      const prompt = buildEventPlanPrompt(sampleEventDetails);
      expect(prompt).toContain("<event_context>");
      expect(prompt).toContain("Maya & Leo's Vineyard Wedding");
      expect(prompt).toContain("USD");
      expect(prompt).toContain("</event_context>");
    });
  });

  describe("Response Generation & Parsing", () => {
    it("parses valid JSON response from mock client", async () => {
      const mockResult = {
        overview: { summary: "A vineyard celebration", personalizedIdeas: ["Idea 1"] },
      };

      const mockClient = {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify(mockResult),
          }),
        },
      } as unknown as GoogleGenAI;

      const output = await generateRawPlan(sampleEventDetails, {
        client: mockClient,
      });

      expect(output).toEqual(mockResult);
      expect(mockClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: DEFAULT_GEMINI_MODEL,
        })
      );
    });

    it("uses GEMINI_MODEL environment variable when set", async () => {
      process.env.GEMINI_MODEL = "gemini-custom-model";

      const mockClient = {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify({ ok: true }),
          }),
        },
      } as unknown as GoogleGenAI;

      await generateRawPlan(sampleEventDetails, {
        client: mockClient,
      });

      expect(mockClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-custom-model",
        })
      );
    });

    it("throws GeminiResponseParsingError on empty model response", async () => {
      const mockClient = {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: "",
          }),
        },
      } as unknown as GoogleGenAI;

      await expect(
        generateRawPlan(sampleEventDetails, { client: mockClient })
      ).rejects.toThrow(GeminiResponseParsingError);
    });

    it("throws GeminiResponseParsingError on malformed JSON", async () => {
      const mockClient = {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: "NOT_VALID_JSON{abc",
          }),
        },
      } as unknown as GoogleGenAI;

      await expect(
        generateRawPlan(sampleEventDetails, { client: mockClient })
      ).rejects.toThrow(GeminiResponseParsingError);
    });

    it("converts AbortError/TimeoutError to GeminiTimeoutError", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";

      const mockClient = {
        models: {
          generateContent: vi.fn().mockRejectedValue(abortError),
        },
      } as unknown as GoogleGenAI;

      await expect(
        generateRawPlan(sampleEventDetails, { client: mockClient })
      ).rejects.toThrow(GeminiTimeoutError);
    });

    it("converts 429 quota errors to RATE_LIMIT_EXCEEDED", async () => {
      const quotaError = new Error("Resource has been exhausted (e.g. check quota) 429");

      const mockClient = {
        models: {
          generateContent: vi.fn().mockRejectedValue(quotaError),
        },
      } as unknown as GoogleGenAI;

      await expect(
        generateRawPlan(sampleEventDetails, { client: mockClient })
      ).rejects.toThrow(GeminiError);
    });

    it("wraps provider errors without leaking API keys", async () => {
      const sensitiveError = new Error(
        "Request failed for AIzaSyA12345678901234567890123456789012 at https://generativelanguage.googleapis.com/v1"
      );

      const mockClient = {
        models: {
          generateContent: vi.fn().mockRejectedValue(sensitiveError),
        },
      } as unknown as GoogleGenAI;

      await expect(
        generateRawPlan(sampleEventDetails, { client: mockClient })
      ).rejects.toThrow(GeminiProviderError);

      try {
        await generateRawPlan(sampleEventDetails, { client: mockClient });
      } catch (err: unknown) {
        expect(err instanceof Error ? err.message : "").not.toContain(
          "AIzaSyA12345678901234567890123456789012"
        );
        expect(err instanceof Error ? err.message : "").toContain("[REDACTED_API_KEY]");
      }
    });
  });

  describe("Error Sanitization Helper", () => {
    it("redacts potential API keys and URLs", () => {
      const raw =
        "Failed with key AIzaSyA12345678901234567890123456789012 on https://example.com/api";
      const sanitized = sanitizeErrorMessage(raw);
      expect(sanitized).not.toContain("AIzaSyA12345678901234567890123456789012");
      expect(sanitized).toContain("[REDACTED_API_KEY]");
      expect(sanitized).toContain("[REDACTED_URL]");
    });
  });
});
