import { z } from "zod";

// ─── Job Criteria ────────────────────────────────────────────────────────────

export const JobCriteriaSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  seniority: z.enum(["Junior", "Mid-Level", "Senior", "Lead", "Principal"]),
  skills: z.string().min(1, "Skills are required"),
  mustHaves: z.string().min(1, "Must-have requirements are required"),
});

export type JobCriteria = z.infer<typeof JobCriteriaSchema>;

export interface JobOpeningRecord {
  id: string;
  title: string;
  seniority: string;
  requiredSkills: string;
  mustHaves: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

// ─── Candidate Evaluation (Gemini Structured Output) ─────────────────────────

export const InterviewQuestionSchema = z.object({
  topic: z.string(),
  question: z
    .string()
    .describe(
      "Deep-probing technical or behavioral question targeting identified gaps"
    ),
  expectedAnswerSummary: z
    .string()
    .describe("What the interviewer should listen for"),
});

export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export const CandidateEvaluationSchema = z.object({
  candidateName: z.string().describe("Full name of the candidate"),
  currentRole: z.string().describe("Current or most recent job title"),
  experienceYears: z
    .number()
    .describe("Total calculated years of relevant experience"),
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall fit score from 0 to 100 based on job criteria"),
  strengths: z
    .array(z.string())
    .describe("Top 3 specific matching skills or achievements"),
  redFlagsOrGaps: z
    .array(z.string())
    .describe("Missing critical skills, short tenures, or skill gaps"),
  suggestedInterviewQuestions: z
    .array(InterviewQuestionSchema)
    .length(3),
  decisionRecommendation: z.enum([
    "Strong Match",
    "Potential Match",
    "Not a Fit",
  ]),
});

export type CandidateEvaluation = z.infer<typeof CandidateEvaluationSchema>;

// ─── Candidate With UI / DB Status ───────────────────────────────────────────

export type CandidateStatus =
  | "pending"
  | "shortlisted"
  | "interview"
  | "rejected"
  | "PENDING"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "REJECTED";

export interface CandidateWithStatus extends CandidateEvaluation {
  id: string; // unique ID
  jobOpeningId?: string;
  status: CandidateStatus;
  fileName: string; // original PDF filename
  email?: string | null;
  createdAt?: string | Date;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface AnalyzeApiResponse {
  results: (CandidateEvaluation & { id?: string; fileName: string; status?: CandidateStatus })[];
  errors: string[];
  jobOpeningId?: string;
}

export interface JobCandidatesApiResponse {
  jobOpening: JobOpeningRecord;
  candidates: CandidateWithStatus[];
}
