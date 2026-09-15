-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED');

-- CreateTable
CREATE TABLE "job_openings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "seniority" TEXT NOT NULL,
    "requiredSkills" TEXT NOT NULL,
    "mustHaves" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "jobOpeningId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "currentRole" TEXT NOT NULL,
    "experienceYears" DOUBLE PRECISION NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "strengths" JSONB NOT NULL,
    "redFlags" JSONB NOT NULL,
    "interviewQuestions" JSONB NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidates_jobOpeningId_idx" ON "candidates"("jobOpeningId");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_jobOpeningId_fkey" FOREIGN KEY ("jobOpeningId") REFERENCES "job_openings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

