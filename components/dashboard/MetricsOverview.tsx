"use client";

import { useMemo } from "react";
import {
  Users,
  TrendingUp,
  Star,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { CandidateWithStatus } from "@/types";

interface MetricsOverviewProps {
  candidates: CandidateWithStatus[];
  loading?: boolean;
}

interface StatCard {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export function MetricsOverview({ candidates, loading }: MetricsOverviewProps) {
  const metrics = useMemo(() => {
    const total = candidates.length;
    const strongMatches = candidates.filter(
      (c) => c.decisionRecommendation === "Strong Match"
    ).length;
    const avgScore =
      total > 0
        ? Math.round(
            candidates.reduce((sum, c) => sum + c.matchScore, 0) / total
          )
        : 0;
    const shortlisted = candidates.filter(
      (c) => c.status === "shortlisted" || c.status === "interview"
    ).length;

    return { total, strongMatches, avgScore, shortlisted };
  }, [candidates]);

  const cards: StatCard[] = [
    {
      label: "Total Candidates",
      value: metrics.total,
      subtext: "Resumes analyzed",
      icon: <Users className="h-5 w-5" />,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Strong Matches",
      value: metrics.strongMatches,
      subtext: "Score ≥ 80",
      icon: <Star className="h-5 w-5" />,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Average Score",
      value: `${metrics.avgScore}`,
      subtext: "Out of 100",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    },
    {
      label: "Shortlisted",
      value: metrics.shortlisted,
      subtext: "Moved forward",
      icon: <UserCheck className="h-5 w-5" />,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {card.label}
            </p>
            <div className={cn("p-2 rounded-lg", card.bgColor, card.color)}>
              {card.icon}
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {card.value}
          </p>
          <p className="text-xs text-slate-400">{card.subtext}</p>
        </div>
      ))}
    </div>
  );
}
