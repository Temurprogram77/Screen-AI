import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CandidateWithStatus,
  CandidateStatus,
  JobCriteria,
} from "@/types";

interface FilterState {
  search: string;
  recommendation: "All" | "Strong Match" | "Potential Match" | "Not a Fit";
}

interface CandidateStore {
  candidates: CandidateWithStatus[];
  jobCriteria: JobCriteria | null;
  currentJobId: string | null;
  filters: FilterState;

  // Actions
  setCandidates: (candidates: CandidateWithStatus[]) => void;
  addCandidates: (candidates: CandidateWithStatus[]) => void;
  setJobCriteria: (criteria: JobCriteria) => void;
  setCurrentJobId: (jobId: string | null) => void;
  updateCandidateStatus: (id: string, status: CandidateStatus) => void;
  setFilter: (patch: Partial<FilterState>) => void;
  resetAll: () => void;
}

const initialFilters: FilterState = {
  search: "",
  recommendation: "All",
};

export const useCandidateStore = create<CandidateStore>()(
  persist(
    (set) => ({
      candidates: [],
      jobCriteria: null,
      currentJobId: null,
      filters: initialFilters,

      setCandidates: (candidates) => set({ candidates }),

      addCandidates: (newCandidates) =>
        set((state) => ({
          candidates: [...state.candidates, ...newCandidates],
        })),

      setJobCriteria: (criteria) => set({ jobCriteria: criteria }),

      setCurrentJobId: (currentJobId) => set({ currentJobId }),

      updateCandidateStatus: (id, status) =>
        set((state) => ({
          candidates: state.candidates.map((c) =>
            c.id === id ? { ...c, status } : c
          ),
        })),

      setFilter: (patch) =>
        set((state) => ({
          filters: { ...state.filters, ...patch },
        })),

      resetAll: () =>
        set({
          candidates: [],
          jobCriteria: null,
          currentJobId: null,
          filters: initialFilters,
        }),
    }),
    {
      name: "screenai-store", // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Persist candidates, jobCriteria, and currentJobId
      partialize: (state) => ({
        candidates: state.candidates,
        jobCriteria: state.jobCriteria,
        currentJobId: state.currentJobId,
      }),
    }
  )
);
