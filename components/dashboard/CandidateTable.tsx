"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn, scoreColor } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { CandidateDrawer } from "./CandidateDrawer";
import type { CandidateWithStatus } from "@/types";

interface CandidateTableProps {
  candidates: CandidateWithStatus[];
  loading?: boolean;
  onStatusUpdated?: () => void;
}

const columnHelper = createColumnHelper<CandidateWithStatus>();

function ScoreBadge({ score }: { score: number }) {
  const { bg, text } = scoreColor(score);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-12 h-7 rounded-full text-xs font-bold",
        bg,
        text
      )}
    >
      {score}
    </span>
  );
}

function RecommendationBadge({ rec }: { rec: string }) {
  const variant =
    rec === "Strong Match"
      ? "green"
      : rec === "Potential Match"
        ? "amber"
        : "red";
  return <Badge variant={variant}>{rec}</Badge>;
}

export function CandidateTable({
  candidates,
  loading,
  onStatusUpdated,
}: CandidateTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "matchScore", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateWithStatus | null>(null);

  const columns = useMemo(
    () => [
      columnHelper.accessor("candidateName", {
        header: "Candidate",
        cell: (info) => (
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              {info.getValue()}
            </p>
            <p className="text-xs text-slate-400 truncate max-w-[160px]">
              {info.row.original.fileName}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("currentRole", {
        header: "Current Role",
        cell: (info) => (
          <span className="text-slate-600 dark:text-slate-300">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("experienceYears", {
        header: "Experience",
        cell: (info) => (
          <span className="text-slate-600 dark:text-slate-300">
            {info.getValue()} yrs
          </span>
        ),
        enableSorting: true,
      }),
      columnHelper.accessor("matchScore", {
        header: "Score",
        cell: (info) => <ScoreBadge score={info.getValue()} />,
        enableSorting: true,
      }),
      columnHelper.accessor("decisionRecommendation", {
        header: "Recommendation",
        cell: (info) => <RecommendationBadge rec={info.getValue()} />,
        filterFn: (row, _id, filterValue) => {
          if (filterValue === "All") return true;
          return row.original.decisionRecommendation === filterValue;
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedCandidate(row.original)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Details
            </button>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <Link
              href={`/candidate/${row.original.id}`}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1"
            >
              Deep Dive <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: candidates,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
    globalFilterFn: (row, _colId, filterValue: string) => {
      const q = filterValue.toLowerCase();
      return (
        row.original.candidateName.toLowerCase().includes(q) ||
        row.original.currentRole.toLowerCase().includes(q)
      );
    },
  });

  const recommendationFilter =
    (columnFilters.find((f) => f.id === "decisionRecommendation")
      ?.value as string) ?? "All";

  const setRecommendationFilter = (value: string) => {
    setColumnFilters((prev) =>
      value === "All"
        ? prev.filter((f) => f.id !== "decisionRecommendation")
        : [
            ...prev.filter((f) => f.id !== "decisionRecommendation"),
            { id: "decisionRecommendation", value },
          ]
    );
  };

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidates or roles…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={recommendationFilter}
          onChange={(e) => setRecommendationFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {["All", "Strong Match", "Potential Match", "Not a Fit"].map((v) => (
            <option key={v} value={v}>
              {v === "All" ? "All Recommendations" : v}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            header.column.getCanSort() &&
                              "cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() &&
                            ({
                              asc: <ChevronUp className="h-3 w-3" />,
                              desc: <ChevronDown className="h-3 w-3" />,
                            }[header.column.getIsSorted() as string] ?? (
                              <ChevronsUpDown className="h-3 w-3 opacity-40" />
                            ))}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    No candidates match your filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedCandidate(row.original)}
                    className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()} ·{" "}
              {table.getFilteredRowModel().rows.length} results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      <CandidateDrawer
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        onStatusUpdated={onStatusUpdated}
      />
    </>
  );
}
