"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, Plus } from "lucide-react";
import { SKILLS_CATALOG, type SkillItem } from "@/lib/constants/skills";

interface SkillTagInputProps {
  value: string; // Comma-separated list of skills
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const DOMAIN_COLORS: Record<SkillItem["domain"], string> = {
  Frontend: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Backend: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  DevOps: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Mobile: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  QA: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  Design: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
};

export function SkillTagInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Type a skill (e.g. React, Docker, Python)...",
}: SkillTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse comma-separated string into list of trimmed tags
  const tags = useMemo(() => {
    if (!value || !value.trim()) return [];
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  const tagsSet = useMemo(() => {
    return new Set(tags.map((t) => t.toLowerCase()));
  }, [tags]);

  // Filter skills based on user input
  const suggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) {
      // Return popular unselected skills
      return SKILLS_CATALOG.filter(
        (s) => !tagsSet.has(s.name.toLowerCase())
      ).slice(0, 8);
    }

    return SKILLS_CATALOG.filter((s) => {
      const name = s.name.toLowerCase();
      return name.includes(query) && !tagsSet.has(name);
    }).slice(0, 10);
  }, [inputValue, tagsSet]);

  const hasExactMatch = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return true;
    return (
      tagsSet.has(query) ||
      SKILLS_CATALOG.some((s) => s.name.toLowerCase() === query)
    );
  }, [inputValue, tagsSet]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = (skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;

    if (!tagsSet.has(trimmed.toLowerCase())) {
      const newTags = [...tags, trimmed];
      onChange(newTags.join(", "));
    }
    setInputValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, i) => i !== indexToRemove);
    onChange(newTags.join(", "));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      // Remove last tag if input is empty
      e.preventDefault();
      removeTag(tags.length - 1);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const maxIndex = suggestions.length + (!hasExactMatch ? 1 : 0) - 1;
      if (maxIndex >= 0) {
        setHighlightedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const maxIndex = suggestions.length + (!hasExactMatch ? 1 : 0) - 1;
      if (maxIndex >= 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
      }
      return;
    }

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const maxIndex = suggestions.length + (!hasExactMatch ? 1 : 0) - 1;
      const safeIndex = highlightedIndex > maxIndex ? 0 : highlightedIndex;
      if (isOpen && suggestions.length > 0 && safeIndex < suggestions.length) {
        addTag(suggestions[safeIndex].name);
      } else if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
      return;
    }

    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input container box */}
      <div
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            setIsOpen(true);
          }
        }}
        className={`min-h-[52px] w-full px-3 py-2 text-sm rounded-lg border transition-all duration-150 flex flex-wrap items-center gap-2 cursor-text ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            : isOpen
              ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-700/80"
              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
        }`}
      >
        {/* Selected Skill Badges */}
        {tags.map((tag, index) => {
          const catalogItem = SKILLS_CATALOG.find(
            (s) => s.name.toLowerCase() === tag.toLowerCase()
          );
          const domainBadge = catalogItem?.domain ? (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                DOMAIN_COLORS[catalogItem.domain]
              }`}
            >
              {catalogItem.domain}
            </span>
          ) : null;

          return (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 animate-in fade-in zoom-in-95 duration-100"
            >
              <span>{tag}</span>
              {domainBadge}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(index);
                  }}
                  className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 rounded-sm p-0.5 transition-colors"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}

        {/* Input for typing tags */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          placeholder={tags.length === 0 ? placeholder : "Add more skills..."}
          onChange={(e) => {
            setInputValue(e.target.value);
            setHighlightedIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[140px] bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {/* Auto-complete Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl py-1 text-sm animate-in fade-in-50 slide-in-from-top-1">
          {suggestions.length > 0 && (
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {inputValue.trim() ? "Matching Skills" : "Suggested Skills"}
            </div>
          )}

          {suggestions.map((skill, index) => {
            const isHighlighted = highlightedIndex === index;
            return (
              <button
                key={skill.name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur
                  addTag(skill.name);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors ${
                  isHighlighted
                    ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <span className="font-medium">{skill.name}</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    DOMAIN_COLORS[skill.domain]
                  }`}
                >
                  {skill.domain}
                </span>
              </button>
            );
          })}

          {/* Option to add custom tag if typed text doesn't exist yet */}
          {inputValue.trim() && !hasExactMatch && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(inputValue.trim());
              }}
              onMouseEnter={() => setHighlightedIndex(suggestions.length)}
              className={`w-full flex items-center gap-2 px-3.5 py-2 text-left border-t border-slate-100 dark:border-slate-700/50 ${
                highlightedIndex === suggestions.length
                  ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300"
                  : "text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>
                Add custom skill:{" "}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  &ldquo;{inputValue.trim()}&rdquo;
                </strong>
              </span>
            </button>
          )}

          {suggestions.length === 0 && !inputValue.trim() && (
            <div className="px-3.5 py-3 text-center text-xs text-slate-400">
              Start typing to search or add custom skills.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
