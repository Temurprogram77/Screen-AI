import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const StatusUpdateSchema = z.object({
  status: z.enum([
    "pending",
    "shortlisted",
    "interview",
    "rejected",
    "PENDING",
    "SHORTLISTED",
    "INTERVIEW",
    "REJECTED",
  ]),
});

export async function PATCH(
  request: NextRequest,
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

    const body = await request.json().catch(() => ({}));
    const parseResult = StatusUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid status value",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    // Normalize to Prisma enum uppercase
    const rawStatus = parseResult.data.status.toUpperCase();
    const dbStatus =
      rawStatus === "PENDING"
        ? "PENDING"
        : rawStatus === "SHORTLISTED"
          ? "SHORTLISTED"
          : rawStatus === "INTERVIEW"
            ? "INTERVIEW"
            : "REJECTED";

    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: dbStatus },
    });

    return NextResponse.json({ candidate: updated });
  } catch (err) {
    console.error("[/api/candidates/[candidateId]/status] PATCH error:", err);
    return NextResponse.json(
      {
        error: "Failed to update candidate status",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
