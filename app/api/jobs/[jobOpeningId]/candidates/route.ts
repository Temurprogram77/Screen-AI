import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CandidateWithStatus, InterviewQuestion } from "@/types";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobOpeningId: string }> }
): Promise<NextResponse> {
  try {
    const { jobOpeningId } = await context.params;

    if (!jobOpeningId) {
      return NextResponse.json(
        { error: "jobOpeningId is required" },
        { status: 400 }
      );
    }

    const jobOpening = await prisma.jobOpening.findUnique({
      where: { id: jobOpeningId },
      include: {
        candidates: {
          orderBy: { matchScore: "desc" },
        },
      },
    });

    if (!jobOpening) {
      return NextResponse.json(
        { error: "Job opening not found" },
        { status: 404 }
      );
    }

    // Map Prisma Candidate model to client CandidateWithStatus
    const candidates: CandidateWithStatus[] = jobOpening.candidates.map((c) => {
      const strengths = Array.isArray(c.strengths)
        ? (c.strengths as string[])
        : [];
      const redFlags = Array.isArray(c.redFlags)
        ? (c.redFlags as string[])
        : [];
      const interviewQuestions = Array.isArray(c.interviewQuestions)
        ? (c.interviewQuestions as unknown as InterviewQuestion[])
        : [];

      return {
        id: c.id,
        jobOpeningId: c.jobOpeningId,
        candidateName: c.name,
        currentRole: c.currentRole,
        experienceYears: c.experienceYears,
        matchScore: c.matchScore,
        decisionRecommendation: c.recommendation as
          | "Strong Match"
          | "Potential Match"
          | "Not a Fit",
        status: c.status,
        strengths,
        redFlagsOrGaps: redFlags,
        suggestedInterviewQuestions: interviewQuestions,
        fileName: c.fileName || "resume.pdf",
        email: c.email,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json({
      jobOpening: {
        id: jobOpening.id,
        title: jobOpening.title,
        seniority: jobOpening.seniority,
        requiredSkills: jobOpening.requiredSkills,
        mustHaves: jobOpening.mustHaves,
        createdAt: jobOpening.createdAt,
        updatedAt: jobOpening.updatedAt,
      },
      candidates,
    });
  } catch (err) {
    console.error("[/api/jobs/[jobOpeningId]/candidates] GET error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch candidates",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
