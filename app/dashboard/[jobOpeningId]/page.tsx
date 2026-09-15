"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Plus, RotateCcw, Database } from "lucide-react";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import { CandidateTable } from "@/components/dashboard/CandidateTable";
import { Button } from "@/components/ui/Button";
import { useCandidateStore } from "@/store/useCandidateStore";
import type { JobCandidatesApiResponse } from "@/types";

interface PageProps {
  params: Promise<{ jobOpeningId: string }>;
}

export default function JobDashboardPage({ params }: PageProps) {
  const { jobOpeningId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    candidates: localCandidates,
    jobCriteria: localJobCriteria,
    setCandidates,
    setJobCriteria,
    setCurrentJobId,
    resetAll,
  } = useCandidateStore();

  const activeJobId = jobOpeningId;

  // Fetch candidates from database via React Query
  const {
    data: dbData,
    isLoading: dbLoading,
  } = useQuery<JobCandidatesApiResponse | null>({
    queryKey: ["candidates", activeJobId],
    queryFn: async () => {
      if (!activeJobId) return null;
      const res = await fetch(`/api/jobs/${activeJobId}/candidates`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to load candidates from database");
      }
      return (await res.json()) as JobCandidatesApiResponse;
    },
    enabled: !!activeJobId,
    staleTime: 30 * 1000,
  });

  // Keep local store in sync with database data when loaded
  useEffect(() => {
    if (dbData?.jobOpening) {
      setJobCriteria({
        title: dbData.jobOpening.title,
        seniority: dbData.jobOpening.seniority as
          | "Junior"
          | "Mid-Level"
          | "Senior"
          | "Lead"
          | "Principal",
        skills: dbData.jobOpening.requiredSkills,
        mustHaves: dbData.jobOpening.mustHaves,
      });
      setCandidates(dbData.candidates);
      if (activeJobId) {
        setCurrentJobId(activeJobId);
      }
    }
  }, [dbData, activeJobId, setCandidates, setJobCriteria, setCurrentJobId]);

  const candidates = dbData?.candidates ?? localCandidates;
  const jobCriteria = dbData?.jobOpening
    ? {
        title: dbData.jobOpening.title,
        seniority: dbData.jobOpening.seniority,
        skills: dbData.jobOpening.requiredSkills,
        mustHaves: dbData.jobOpening.mustHaves,
      }
    : localJobCriteria;

  const handleReset = () => {
    if (
      confirm(
        "Start a new screening session? (Your saved jobs in the database remain safe)"
      )
    ) {
      resetAll();
      router.push("/");
    }
  };

  const handleStatusUpdated = () => {
    if (activeJobId) {
      queryClient.invalidateQueries({ queryKey: ["candidates", activeJobId] });
    }
  };

  if (dbLoading && candidates.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 animate-pulse">
            <Database className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading candidates from database…
          </p>
        </div>
      </div>
    );
  }

  const addMoreHref = activeJobId ? `/?jobId=${activeJobId}` : "/";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Nav */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">
              ScreenAI
            </span>
          </Link>

          {jobCriteria && (
            <>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {jobCriteria.title}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {jobCriteria.seniority}
                </span>
              </div>
            </>
          )}

          {activeJobId && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
              <Database className="h-3 w-3" />
              Synced with DB
            </span>
          )}

          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Session
            </Button>
            <Link href={addMoreHref}>
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add More
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Candidate Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}{" "}
            evaluated — click any row to inspect details and update hiring status
          </p>
        </div>

        {/* Metrics */}
        <MetricsOverview candidates={candidates} />

        {/* Table */}
        <CandidateTable
          candidates={candidates}
          loading={dbLoading}
          onStatusUpdated={handleStatusUpdated}
        />
      </main>
    </div>
  );
}
