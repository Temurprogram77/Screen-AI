"use client";

import { useState, useEffect, Suspense, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  Sparkles,
  AlertCircle,
  Database,
  LayoutDashboard,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { SkillTagInput } from "@/components/form/SkillTagInput";
import { DropzoneArea } from "@/components/upload/DropzoneArea";
import { UploadProgress, type FileProgress } from "@/components/upload/UploadProgress";
import { Button } from "@/components/ui/Button";
import { useCandidateStore } from "@/store/useCandidateStore";
import {
  JobCriteriaSchema,
  type CandidateEvaluation,
  type JobCriteria,
  type CandidateWithStatus,
  type CandidateStatus,
  type JobCandidatesApiResponse,
} from "@/types";

const SENIORITY_LEVELS = [
  "Junior",
  "Mid-Level",
  "Senior",
  "Lead",
  "Principal",
] as const;

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingJobId = searchParams.get("jobId");
  const isClient = useIsClient();

  const {
    candidates,
    currentJobId,
    setCandidates,
    addCandidates,
    setJobCriteria,
    setCurrentJobId,
    resetAll,
  } = useCandidateStore();

  const targetDashboardHref = existingJobId
    ? `/dashboard?jobId=${existingJobId}`
    : currentJobId
      ? `/dashboard?jobId=${currentJobId}`
      : "/dashboard";

  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<JobCriteria>({
    title: "",
    seniority: "Mid-Level",
    skills: "",
    mustHaves: "",
  });

  // If existingJobId is provided (via "+ Add More"), fetch existing criteria
  useEffect(() => {
    if (existingJobId) {
      fetch(`/api/jobs/${existingJobId}/candidates`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: JobCandidatesApiResponse | null) => {
          if (data?.jobOpening) {
            setForm({
              title: data.jobOpening.title,
              seniority: data.jobOpening.seniority as
                | "Junior"
                | "Mid-Level"
                | "Senior"
                | "Lead"
                | "Principal",
              skills: data.jobOpening.requiredSkills,
              mustHaves: data.jobOpening.mustHaves,
            });
          }
        })
        .catch((err) =>
          console.error("Failed to load existing job opening criteria:", err)
        );
    }
  }, [existingJobId]);

  const updateForm = (field: keyof JobCriteria, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const [suggestingSkills, setSuggestingSkills] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const handleAutoSuggestSkills = async () => {
    if (!form.title.trim()) {
      setSuggestError("Please enter a Job Title first to auto-suggest skills.");
      return;
    }
    setSuggestError(null);
    setSuggestingSkills(true);
    try {
      const res = await fetch("/api/skills/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          seniority: form.seniority,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch skill suggestions");
      }

      const data = await res.json();
      if (Array.isArray(data.skills) && data.skills.length > 0) {
        const currentSkills = form.skills
          ? form.skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const existingSet = new Set(currentSkills.map((s) => s.toLowerCase()));
        const newToAdd = data.skills.filter(
          (s: string) => !existingSet.has(s.toLowerCase())
        );
        const merged = [...currentSkills, ...newToAdd];
        updateForm("skills", merged.join(", "));
      }
    } catch (err) {
      console.error("Auto-suggest skills error:", err);
      setSuggestError("Could not auto-suggest skills at this time.");
    } finally {
      setSuggestingSkills(false);
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setError(null);

    // Client-side validation
    const criteriaResult = JobCriteriaSchema.safeParse(form);
    if (!criteriaResult.success) {
      setError(
        criteriaResult.error.issues[0]?.message ??
          "Please fill all required fields."
      );
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one PDF resume.");
      return;
    }

    setSubmitting(true);
    if (!existingJobId) {
      resetAll();
    }

    // Initialize all files with "pending" status
    const currentProgress: FileProgress[] = files.map((f) => ({
      name: f.name,
      status: "pending",
    }));
    setFileProgress(currentProgress);
    setProgressMessage(
      `Queued ${files.length} resume${files.length > 1 ? "s" : ""} for analysis...`
    );

    const allResults: (CandidateEvaluation & {
      id?: string;
      fileName: string;
      status?: string;
    })[] = [];
    const allErrors: string[] = [];
    const BATCH_SIZE = 2; // Controlled concurrency of 2 resumes in parallel
    let finalJobOpeningId = existingJobId;

    try {
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batchFiles = files.slice(i, i + BATCH_SIZE);
        const batchStart = i + 1;
        const batchEnd = Math.min(i + batchFiles.length, files.length);

        // Mark current batch as "analyzing"
        batchFiles.forEach((bf) => {
          const item = currentProgress.find((p) => p.name === bf.name);
          if (item) item.status = "analyzing";
        });
        setFileProgress([...currentProgress]);

        const rangeStr =
          batchStart === batchEnd
            ? `${batchStart} of ${files.length}`
            : `${batchStart}–${batchEnd} of ${files.length}`;
        setProgressMessage(`Analyzing resume ${rangeStr}...`);

        // Send this batch to /api/analyze with jobOpeningId if present
        const formData = new FormData();
        if (finalJobOpeningId) {
          formData.append("jobOpeningId", finalJobOpeningId);
        }
        formData.append("jobCriteria", JSON.stringify(criteriaResult.data));
        batchFiles.forEach((f) => formData.append("files", f));

        const res = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const errMsg = body.error ?? `Server error ${res.status}`;
          batchFiles.forEach((bf) => {
            const item = currentProgress.find((p) => p.name === bf.name);
            if (item) {
              item.status = "error";
              item.error = errMsg;
            }
            allErrors.push(`${bf.name}: ${errMsg}`);
          });
        } else {
          const data: {
            results: (CandidateEvaluation & {
              id?: string;
              fileName: string;
              status?: string;
            })[];
            errors: string[];
            jobOpeningId?: string;
          } = await res.json();

          if (data.jobOpeningId) {
            finalJobOpeningId = data.jobOpeningId;
          }

          allResults.push(...data.results);
          allErrors.push(...data.errors);

          const successSet = new Set(data.results.map((r) => r.fileName));
          batchFiles.forEach((bf) => {
            const item = currentProgress.find((p) => p.name === bf.name);
            if (item) {
              if (successSet.has(bf.name)) {
                item.status = "success";
              } else {
                item.status = "error";
                const errDetail = data.errors.find((e) => e.startsWith(bf.name));
                item.error = errDetail || "Analysis failed";
              }
            }
          });
        }

        setFileProgress([...currentProgress]);
        setProgressMessage(`Completed ${batchEnd} of ${files.length} resumes`);

        // Throttle delay between batches
        if (i + BATCH_SIZE < files.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      if (allResults.length > 0) {
        setProgressMessage(
          `Completed ${allResults.length} of ${files.length}! Redirecting to dashboard...`
        );

        const candidates: CandidateWithStatus[] = allResults.map((r) => ({
          ...r,
          id: r.id || generateId(),
          status: (r.status as CandidateStatus) || "PENDING",
        }));

        setJobCriteria(criteriaResult.data);
        if (finalJobOpeningId) {
          setCurrentJobId(finalJobOpeningId);
        }

        if (existingJobId) {
          addCandidates(candidates);
        } else {
          setCandidates(candidates);
        }

        // Brief pause so user sees 100% completion before navigating
        await new Promise((r) => setTimeout(r, 800));
        const redirectUrl = finalJobOpeningId
          ? `/dashboard?jobId=${finalJobOpeningId}`
          : "/dashboard";
        router.push(redirectUrl);
      } else {
        const errorSummary =
          allErrors.length > 0
            ? allErrors.join("\n")
            : "No resumes could be evaluated. Please check the files and try again.";
        setError(errorSummary);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      currentProgress.forEach((item) => {
        if (item.status === "analyzing" || item.status === "pending") {
          item.status = "error";
          item.error = msg;
        }
      });
      setFileProgress([...currentProgress]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Nav */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 group-hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">
              ScreenAI
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>PostgreSQL &amp; Gemini Flash</span>
            </div>

            <Link
              href={targetDashboardHref}
              className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 hover:shadow-md hover:shadow-indigo-500/40 active:scale-[0.98]"
            >
              <LayoutDashboard className="h-4 w-4 text-indigo-100" />
              <span>Dashboard</span>
              {isClient && candidates.length > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-white/20 text-white">
                  {candidates.length}
                </span>
              )}
              <ArrowRight className="h-3.5 w-3.5 text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            AI Resume Screening
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Find your best{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              candidates
            </span>{" "}
            instantly
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
            Upload resumes, define your requirements, and let Gemini AI rank,
            score, and generate tailored interview questions — persisted in
            PostgreSQL.
          </p>
        </div>

        {/* Existing Job Notice Banner */}
        {existingJobId && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-sm">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                Adding more resumes to existing job:{" "}
                <strong>{form.title || "Loading..."}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                resetAll();
                router.push("/");
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Start New Job Instead
            </button>
          </div>
        )}

        {/* Form card */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAnalyze(e);
          }}
          className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-8"
        >
          {/* Job criteria section */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Briefcase className="h-5 w-5 text-indigo-500" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Job Requirements
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Job Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Engineer"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Seniority Level <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.seniority}
                  onChange={(e) => updateForm("seniority", e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  {SENIORITY_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Required Skills <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoSuggestSkills}
                    disabled={submitting || suggestingSkills}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-50 py-0.5 px-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                  >
                    {suggestingSkills ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                        <span>Suggesting skills...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>✨ Auto-suggest Skills</span>
                      </>
                    )}
                  </button>
                </div>

                <SkillTagInput
                  value={form.skills}
                  onChange={(val) => {
                    updateForm("skills", val);
                    if (suggestError) setSuggestError(null);
                  }}
                  disabled={submitting}
                />

                {suggestError && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{suggestError}</span>
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Must-Have Requirements <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. 5+ years experience, team leadership, system design at scale, strong communication"
                  value={form.mustHaves}
                  onChange={(e) => updateForm("mustHaves", e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-60"
                />
              </div>
            </div>
          </section>

          {/* Upload section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Upload Resumes
              </h2>
              {files.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-medium">
                  {files.length} file{files.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <DropzoneArea
              files={files}
              onFilesChange={setFiles}
              disabled={submitting}
            />
          </section>

          {/* Progress */}
          {fileProgress.length > 0 && (
            <section>
              <UploadProgress
                files={fileProgress}
                statusMessage={progressMessage}
              />
            </section>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="whitespace-pre-line">{error}</div>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              handleAnalyze(e);
            }}
            loading={submitting}
            disabled={submitting}
            size="lg"
            className="w-full"
          >
            <Sparkles className="h-4 w-4" />
            {submitting
              ? "Analyzing Resumes…"
              : existingJobId
                ? "Analyze & Append Resumes to Job"
                : "Analyze Resumes & Save to Database"}
          </Button>
        </form>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
