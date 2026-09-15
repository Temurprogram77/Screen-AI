"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  Sparkles,
  Star,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useCandidateStore } from "@/store/useCandidateStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { scoreColor } from "@/lib/utils";
import type { CandidateStatus, CandidateWithStatus } from "@/types";

interface PageProps {
  params: Promise<{ candidateId: string }>;
}

export default function CandidateDetailPage({ params }: PageProps) {
  const { candidateId } = use(params);
  const queryClient = useQueryClient();
  const { candidates, updateCandidateStatus } = useCandidateStore();

  const localCandidate = candidates.find((c) => c.id === candidateId);

  const { data: dbData, isLoading } = useQuery<{
    candidate: CandidateWithStatus;
  } | null>({
    queryKey: ["candidate", candidateId],
    queryFn: async () => {
      const res = await fetch(`/api/candidates/${candidateId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !localCandidate && !!candidateId,
  });

  const candidate = localCandidate || dbData?.candidate || null;

  if (isLoading && !localCandidate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Loading candidate details…</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">
          Candidate not found.
        </p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const { bg: scoreBg, text: scoreText } = scoreColor(candidate.matchScore);
  const recVariant =
    candidate.decisionRecommendation === "Strong Match"
      ? "green"
      : candidate.decisionRecommendation === "Potential Match"
        ? "amber"
        : "red";

  const statusActions: {
    status: CandidateStatus;
    label: string;
    icon: React.ReactNode;
    variant: "primary" | "secondary" | "danger" | "outline";
  }[] = [
    {
      status: "shortlisted",
      label: "Shortlist",
      icon: <CheckCircle className="h-4 w-4" />,
      variant: "primary",
    },
    {
      status: "interview",
      label: "Schedule Interview",
      icon: <Calendar className="h-4 w-4" />,
      variant: "secondary",
    },
    {
      status: "rejected",
      label: "Reject",
      icon: <XCircle className="h-4 w-4" />,
      variant: "danger",
    },
  ];

  const dashboardHref = candidate.jobOpeningId
    ? `/dashboard?jobId=${candidate.jobOpeningId}`
    : "/dashboard";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Nav */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href={dashboardHref}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {candidate.candidateName}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-slate-400">Gemini Analysis</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Hero card */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Score ring */}
            <div
              className={`flex flex-col items-center justify-center w-24 h-24 rounded-full shrink-0 ${scoreBg}`}
            >
              <span className={`text-3xl font-extrabold ${scoreText}`}>
                {candidate.matchScore}
              </span>
              <span className={`text-xs font-medium ${scoreText}`}>/ 100</span>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {candidate.candidateName}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                {candidate.currentRole} · {candidate.experienceYears} years experience
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant={recVariant}>
                  {candidate.decisionRecommendation}
                </Badge>
                <Badge variant="gray" className="capitalize">
                  {candidate.status}
                </Badge>
                <span className="text-xs text-slate-400">{candidate.fileName}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            {statusActions.map(({ status, label, icon, variant }) => (
              <Button
                key={status}
                variant={
                  (candidate.status || "").toLowerCase() === status.toLowerCase()
                    ? variant
                    : "outline"
                }
                size="sm"
                onClick={async () => {
                  updateCandidateStatus(candidate.id, status);
                  try {
                    await fetch(`/api/candidates/${candidate.id}/status`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status }),
                    });
                    queryClient.invalidateQueries({
                      queryKey: ["candidate", candidate.id],
                    });
                  } catch (err) {
                    console.error("Failed to update candidate status:", err);
                  }
                }}
                className="gap-1.5"
              >
                {icon}
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-emerald-500" />
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Key Strengths
              </h2>
            </div>
            <ul className="space-y-3">
              {candidate.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Red Flags */}
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Red Flags / Gaps
              </h2>
            </div>
            {candidate.redFlagsOrGaps.length > 0 ? (
              <ul className="space-y-3">
                {candidate.redFlagsOrGaps.map((r, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <XCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <span className="text-sm text-slate-700 dark:text-slate-200">{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No significant red flags identified.</p>
            )}
          </div>
        </div>

        {/* Interview Questions */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-5">
            Tailored Interview Questions
          </h2>
          <div className="space-y-5">
            {candidate.suggestedInterviewQuestions.map((q, i) => (
              <div
                key={i}
                className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden"
              >
                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                        {q.topic}
                      </p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-1">
                        {q.question}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    What to listen for
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {q.expectedAnswerSummary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
