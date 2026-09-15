import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CandidateWithStatus, InterviewQuestion } from "@/types";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ candidateId: string }> }
): Promise<NextResponse> {
  try {
    const { candidateId } = await context.params;

    if (!candidateId) {
      return NextResponse.json(
        { error: "candidateId is required" },
        { status: 400 }
      );
    }

    const c = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!c) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    const strengths = Array.isArray(c.strengths)
      ? (c.strengths as string[])
      : [];
    const redFlags = Array.isArray(c.redFlags)
      ? (c.redFlags as string[])
      : [];
    const interviewQuestions = Array.isArray(c.interviewQuestions)
      ? (c.interviewQuestions as unknown as InterviewQuestion[])
      : [];

    const candidate: CandidateWithStatus = {
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

    return NextResponse.json({ candidate });
  } catch (err) {
    console.error("[/api/candidates/[candidateId]] GET error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch candidate",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
