/**
 * Server-side only: Gemini API client with model fallback chain and retry logic.
 * Uses @google/genai with structured JSON output validated by Zod.
 */
import { GoogleGenAI, Type } from "@google/genai";
import {
  CandidateEvaluationSchema,
  type CandidateEvaluation,
  type JobCriteria,
} from "@/types";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Ordered fallback models: Primary -> Fallback
export const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
] as const;

export type SupportedModel = (typeof FALLBACK_MODELS)[number];

// JSON Schema for Gemini structured output (derived from Zod schema)
const candidateResponseSchema = {
  type: Type.OBJECT,
  properties: {
    candidateName: {
      type: Type.STRING,
      description: "Full name of the candidate",
    },
    currentRole: {
      type: Type.STRING,
      description: "Current or most recent job title",
    },
    experienceYears: {
      type: Type.NUMBER,
      description: "Total calculated years of relevant experience",
    },
    matchScore: {
      type: Type.NUMBER,
      description: "Overall fit score from 0 to 100 based on job criteria",
    },
    strengths: {
      type: Type.ARRAY,
      description: "Top 3 specific matching skills or achievements",
      items: { type: Type.STRING },
    },
    redFlagsOrGaps: {
      type: Type.ARRAY,
      description: "Missing critical skills, short tenures, or skill gaps",
      items: { type: Type.STRING },
    },
    suggestedInterviewQuestions: {
      type: Type.ARRAY,
      description: "Exactly 3 tailored interview questions",
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          question: {
            type: Type.STRING,
            description:
              "Deep-probing technical or behavioral question targeting identified gaps",
          },
          expectedAnswerSummary: {
            type: Type.STRING,
            description: "What the interviewer should listen for",
          },
        },
        required: ["topic", "question", "expectedAnswerSummary"],
      },
    },
    decisionRecommendation: {
      type: Type.STRING,
      enum: ["Strong Match", "Potential Match", "Not a Fit"],
      description: "Overall hiring recommendation",
    },
  },
  required: [
    "candidateName",
    "currentRole",
    "experienceYears",
    "matchScore",
    "strengths",
    "redFlagsOrGaps",
    "suggestedInterviewQuestions",
    "decisionRecommendation",
  ],
};

/**
 * Identify temporary/transient errors (HTTP 429 rate limit, 503 service unavailable, quota exhaustion, etc.)
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = error as any;

  const status =
    anyErr.status ??
    anyErr.statusCode ??
    anyErr.code ??
    anyErr.response?.status ??
    anyErr.statusText;

  if (
    status === 429 ||
    status === 503 ||
    status === "RESOURCE_EXHAUSTED" ||
    status === "UNAVAILABLE"
  ) {
    return true;
  }

  const message = String(anyErr.message || anyErr).toLowerCase();
  return (
    message.includes("429") ||
    message.includes("503") ||
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("quota") ||
    message.includes("resource exhausted") ||
    message.includes("resource_exhausted") ||
    message.includes("overloaded") ||
    message.includes("unavailable") ||
    message.includes("too many requests") ||
    message.includes("service unavailable") ||
    message.includes("high traffic") ||
    message.includes("temporarily unavailable")
  );
}

/**
 * Exponential backoff with jitter:
 * - Retry 1: ~1000ms ± 200ms
 * - Retry 2: ~2500ms ± 300ms
 */
function getBackoffDelay(retryCount: number): number {
  const base = retryCount === 1 ? 1000 : 2500;
  const jitter = Math.floor(Math.random() * 400) - 200; // ±200ms jitter
  return Math.max(500, base + jitter);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute a single generation call with structured JSON schema
 */
async function callGeminiModel(
  model: string,
  prompt: string
): Promise<CandidateEvaluation> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: candidateResponseSchema,
      temperature: 0.3,
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error(`Model "${model}" returned an empty response.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(
      `Model "${model}" response was not valid JSON: ${rawText.slice(0, 200)}`
    );
  }

  const result = CandidateEvaluationSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Model "${model}" output failed schema validation: ${result.error.message}`
    );
  }

  return result.data;
}

/**
 * Analyze a candidate resume against job criteria using an execution wrapper
 * with model fallback chain (gemini-2.0-flash -> gemini-1.5-flash) and
 * exponential backoff retries for transient 429/503 errors.
 */
export async function analyzeResume(
  pdfText: string,
  jobCriteria: JobCriteria
): Promise<CandidateEvaluation> {
  const prompt = `
You are an expert technical recruiter performing a structured resume evaluation.

## Job Requirements
- **Title:** ${jobCriteria.title}
- **Seniority Level:** ${jobCriteria.seniority}
- **Required Skills:** ${jobCriteria.skills}
- **Must-Have Requirements:** ${jobCriteria.mustHaves}

## Candidate Resume
${pdfText}

## Instructions
Analyze the candidate's resume against the job requirements above. Provide:
1. A match score (0-100) reflecting overall fit
2. At least 3 key strengths relevant to the role
3. Any red flags, gaps, or missing qualifications
4. Exactly 3 deep, tailored interview questions addressing identified gaps
5. A clear decision recommendation

Be specific and evidence-based. Reference actual items from the resume.
`.trim();

  let lastError: unknown;
  const maxRetriesPerModel = 2; // Up to 2 retries (3 attempts total) per model

  for (let mIdx = 0; mIdx < FALLBACK_MODELS.length; mIdx++) {
    const currentModel = FALLBACK_MODELS[mIdx];

    for (let retry = 0; retry <= maxRetriesPerModel; retry++) {
      try {
        if (retry > 0) {
          const delay = getBackoffDelay(retry);
          console.warn(
            `[lib/gemini] Retrying model "${currentModel}" (attempt ${retry + 1}/${maxRetriesPerModel + 1}) after ${delay}ms backoff...`
          );
          await sleep(delay);
        }

        return await callGeminiModel(currentModel, prompt);
      } catch (err) {
        lastError = err;
        const transient = isTransientError(err);
        const errMsg = err instanceof Error ? err.message : String(err);

        console.warn(
          `[lib/gemini] Model "${currentModel}" attempt ${retry + 1} failed [transient=${transient}]: ${errMsg}`
        );

        // If error is not transient, do not retry the same model
        if (!transient) {
          break;
        }

        if (retry === maxRetriesPerModel) {
          console.warn(
            `[lib/gemini] Max retries exhausted for model "${currentModel}".`
          );
        }
      }
    }

    // Attempt next model in fallback chain
    if (mIdx < FALLBACK_MODELS.length - 1) {
      const fallbackModel = FALLBACK_MODELS[mIdx + 1];
      console.warn(
        `[lib/gemini] Switching to fallback model "${fallbackModel}"...`
      );
    }
  }

  throw new Error(
    `Resume analysis failed across all fallback models. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
