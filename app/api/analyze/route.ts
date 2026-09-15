import { NextRequest, NextResponse } from "next/server";
import { JobCriteriaSchema, type CandidateEvaluation } from "@/types";
import { extractPdfText } from "@/lib/pdf";
import { analyzeResume } from "@/lib/gemini";
import { batchWithConcurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

// Force Node.js runtime — pdf-parse/unpdf and Prisma require it
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();

    // ── 1. Check for existing or passed jobOpeningId ─────────────────────────
    const jobOpeningIdRaw = formData.get("jobOpeningId");
    let jobOpeningId =
      typeof jobOpeningIdRaw === "string" && jobOpeningIdRaw.trim()
        ? jobOpeningIdRaw.trim()
        : null;

    // ── 2. Validate job criteria ──────────────────────────────────────────────
    const jobCriteriaRaw = formData.get("jobCriteria");
    if (!jobCriteriaRaw || typeof jobCriteriaRaw !== "string") {
      return NextResponse.json(
        { error: "Missing jobCriteria field" },
        { status: 400 }
      );
    }

    let jobCriteriaParsed: unknown;
    try {
      jobCriteriaParsed = JSON.parse(jobCriteriaRaw);
    } catch {
      return NextResponse.json(
        { error: "jobCriteria must be valid JSON" },
        { status: 400 }
      );
    }

    const criteriaResult = JobCriteriaSchema.safeParse(jobCriteriaParsed);
    if (!criteriaResult.success) {
      return NextResponse.json(
        { error: "Invalid job criteria", details: criteriaResult.error.issues },
        { status: 400 }
      );
    }
    const jobCriteria = criteriaResult.data;

    // ── 3. Find or Create JobOpening record in database ───────────────────────
    let jobOpening = null;
    if (jobOpeningId) {
      jobOpening = await prisma.jobOpening.findUnique({
        where: { id: jobOpeningId },
      });
    }

    if (!jobOpening) {
      jobOpening = await prisma.jobOpening.create({
        data: {
          title: jobCriteria.title,
          seniority: jobCriteria.seniority,
          requiredSkills: jobCriteria.skills,
          mustHaves: jobCriteria.mustHaves,
        },
      });
      jobOpeningId = jobOpening.id;
    }

    // ── 4. Collect uploaded PDF files ─────────────────────────────────────────
    const fileEntries = formData.getAll("files");
    if (fileEntries.length === 0) {
      return NextResponse.json(
        { error: "No PDF files uploaded" },
        { status: 400 }
      );
    }

    const files = fileEntries.filter(
      (entry): entry is File => entry instanceof File
    );

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Uploaded entries are not valid File objects" },
        { status: 400 }
      );
    }

    // ── 5. Process files with concurrency limit (max 2 parallel, 500ms delay) ──
    const settled = await batchWithConcurrency(
      files,
      async (file: File) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfText = await extractPdfText(buffer);
        const evaluation = await analyzeResume(pdfText, jobCriteria);

        // Save candidate record into the database via Prisma
        const savedCandidate = await prisma.candidate.create({
          data: {
            jobOpeningId: jobOpening.id,
            name: evaluation.candidateName,
            currentRole: evaluation.currentRole,
            experienceYears: evaluation.experienceYears,
            matchScore: evaluation.matchScore,
            recommendation: evaluation.decisionRecommendation,
            status: "PENDING",
            strengths: evaluation.strengths,
            redFlags: evaluation.redFlagsOrGaps,
            interviewQuestions: evaluation.suggestedInterviewQuestions,
            fileName: file.name,
          },
        });

        return {
          id: savedCandidate.id,
          fileName: file.name,
          status: savedCandidate.status,
          evaluation,
        };
      },
      2, // Concurrency limit of 2 (process max 2 resumes in parallel)
      500 // Artificial throttle delay (500ms) between batches to stay within RPM quota
    );

    const results: (CandidateEvaluation & {
      id: string;
      fileName: string;
      status: string;
    })[] = [];
    const errors: string[] = [];

    settled.forEach((result, idx) => {
      const fileName = files[idx]?.name ?? `file-${idx}`;
      if (result.status === "fulfilled") {
        results.push({
          ...result.value.evaluation,
          id: result.value.id,
          fileName: result.value.fileName,
          status: result.value.status,
        });
      } else {
        const reason =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        errors.push(`${fileName}: ${reason}`);
      }
    });

    return NextResponse.json({
      results,
      errors,
      jobOpeningId: jobOpening.id,
    });
  } catch (err) {
    console.error("[/api/analyze] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
