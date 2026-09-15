"use client";

import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type FileUploadStatus = "pending" | "analyzing" | "success" | "error";

export interface FileProgress {
  name: string;
  status: FileUploadStatus;
  error?: string;
}

interface UploadProgressProps {
  files: FileProgress[];
  statusMessage?: string;
}

const statusConfig: Record<
  FileUploadStatus,
  { icon: React.ReactNode; label: string; color: string }
> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    label: "Queued",
    color: "text-slate-400",
  },
  analyzing: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: "Analyzing…",
    color: "text-indigo-500",
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Complete",
    color: "text-emerald-500",
  },
  error: {
    icon: <XCircle className="h-4 w-4" />,
    label: "Failed",
    color: "text-red-500",
  },
};

export function UploadProgress({ files, statusMessage }: UploadProgressProps) {
  if (files.length === 0) return null;

  const done = files.filter(
    (f) => f.status === "success" || f.status === "error"
  ).length;

  const analyzing = files.filter((f) => f.status === "analyzing").length;

  const progressPct = Math.round((done / files.length) * 100);

  const displayMessage =
    statusMessage ||
    (done === files.length
      ? `Completed ${files.length} of ${files.length}`
      : analyzing > 0
        ? `Analyzing ${Math.min(done + analyzing, files.length)} of ${files.length}...`
        : `${done} / ${files.length} files processed`);

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div>
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {displayMessage}
          </span>
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {progressPct}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Per-file status */}
      <ul className="space-y-2">
        {files.map((file) => {
          const cfg = statusConfig[file.status];
          return (
            <li
              key={file.name}
              className="flex items-start gap-3 text-sm"
            >
              <span className={cn("mt-0.5 shrink-0", cfg.color)}>
                {cfg.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-slate-700 dark:text-slate-200 font-medium">
                  {file.name}
                </p>
                {file.error && (
                  <p className="text-xs text-red-500 mt-0.5 truncate">
                    {file.error}
                  </p>
                )}
              </div>
              <span className={cn("shrink-0 text-xs font-medium", cfg.color)}>
                {cfg.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
