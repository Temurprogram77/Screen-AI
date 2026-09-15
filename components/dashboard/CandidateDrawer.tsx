"use client";

import { useState } from "react";
import { CheckCircle, Calendar, XCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { scoreColor } from "@/lib/utils";
import { useCandidateStore } from "@/store/useCandidateStore";
import type { CandidateWithStatus, CandidateStatus, InterviewQuestion } from "@/types";

interface CandidateDrawerProps {
  candidate: CandidateWithStatus | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

function InterviewQuestionAccordion({ q, index }: { q: InterviewQuestion; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold mt-0.5">
            {index + 1}
          </span>
          <div>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              {q.topic}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">
              {q.question}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            What to listen for
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {q.expectedAnswerSummary}
          </p>
        </div>
      )}
    </div>
  );
}

export function CandidateDrawer({ candidate, onClose, onStatusUpdated }: CandidateDrawerProps) {
  const updateCandidateStatus = useCandidateStore((s) => s.updateCandidateStatus);

  if (!candidate) {
    return <Drawer open={false} onClose={onClose} />;
  }

  const { bg: scoreBg, text: scoreText } = scoreColor(candidate.matchScore);

  const recVariant =
    candidate.decisionRecommendation === "Strong Match"
      ? "green"
      : candidate.decisionRecommendation === "Potential Match"
        ? "amber"
        : "red";

  const normalizedStatus = (candidate.status || "pending").toLowerCase();
  const statusVariant =
    normalizedStatus === "shortlisted"
      ? "blue"
      : normalizedStatus === "interview"
        ? "purple"
        : normalizedStatus === "rejected"
          ? "red"
          : "gray";

  const handleStatusChange = async (newStatus: CandidateStatus) => {
    updateCandidateStatus(candidate.id, newStatus);
    try {
      await fetch(`/api/candidates/${candidate.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusUpdated?.();
    } catch (err) {
      console.error("Failed to update status in DB:", err);
    }
  };

  return (
    <Drawer
      open={!!candidate}
      onClose={onClose}
      title={candidate.candidateName}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {candidate.currentRole}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {candidate.experienceYears} yrs experience · {candidate.fileName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${scoreBg} ${scoreText}`}
            >
              {candidate.matchScore}/100
            </span>
            <Badge variant={recVariant}>
              {candidate.decisionRecommendation}
            </Badge>
          </div>
        </div>

        {/* Status pill */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Current Status:
          </span>
          <Badge variant={statusVariant} className="capitalize">
            {normalizedStatus}
          </Badge>
        </div>

        {/* Strengths */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
            Top Strengths
          </h3>
          <ul className="space-y-2">
            {candidate.strengths.map((s, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Red Flags / Gaps */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
            Red Flags &amp; Gaps
          </h3>
          {candidate.redFlagsOrGaps.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No significant flags identified.</p>
          ) : (
            <ul className="space-y-2">
              {candidate.redFlagsOrGaps.map((f, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Interview Questions */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
            Suggested Interview Questions
          </h3>
          <div className="space-y-2">
            {candidate.suggestedInterviewQuestions.map((q, idx) => (
              <InterviewQuestionAccordion key={idx} q={q} index={idx} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Recruiter Actions
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={normalizedStatus === "shortlisted" ? "primary" : "outline"}
              size="sm"
              onClick={() => handleStatusChange("SHORTLISTED")}
              className="flex-col gap-0.5 h-auto py-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Shortlist</span>
            </Button>
            <Button
              variant={normalizedStatus === "interview" ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleStatusChange("INTERVIEW")}
              className="flex-col gap-0.5 h-auto py-2"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Interview</span>
            </Button>
            <Button
              variant={normalizedStatus === "rejected" ? "danger" : "outline"}
              size="sm"
              onClick={() => handleStatusChange("REJECTED")}
              className="flex-col gap-0.5 h-auto py-2"
            >
              <XCircle className="h-4 w-4" />
              <span className="text-xs">Reject</span>
            </Button>
          </div>

          <Link
            href={`/candidate/${candidate.id}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Full Deep-Dive View <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Drawer>
  );
}
