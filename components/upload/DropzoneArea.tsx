"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneAreaProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

export function DropzoneArea({
  files,
  onFilesChange,
  disabled = false,
}: DropzoneAreaProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      // Merge with existing files, deduplicating by name
      const existing = new Set(files.map((f) => f.name));
      const merged = [...files, ...accepted.filter((f) => !existing.has(f.name))];
      onFilesChange(merged);
    },
    [files, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    disabled,
  });

  const removeFile = (name: string) => {
    onFilesChange(files.filter((f) => f.name !== name));
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3",
          "rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
          isDragActive
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
            : "border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            "flex items-center justify-center w-14 h-14 rounded-full",
            isDragActive
              ? "bg-indigo-100 dark:bg-indigo-900/50"
              : "bg-slate-100 dark:bg-slate-800"
          )}
        >
          <UploadCloud
            className={cn(
              "h-7 w-7",
              isDragActive
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-400"
            )}
          />
        </div>
        {isDragActive ? (
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            Drop PDFs here…
          </p>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Drag & drop PDF resumes here
            </p>
            <p className="text-xs text-slate-400 mt-1">
              or click to browse · Multiple files supported
            </p>
          </div>
        )}
      </div>

      {/* File chips */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.name}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate">
                {file.name}
              </span>
              <span className="text-xs text-slate-400 shrink-0">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(file.name)}
                  className="shrink-0 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
