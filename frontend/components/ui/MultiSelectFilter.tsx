"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type MultiSelectFilterProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const buttonLabel =
    selected.length === 0
      ? label
      : selected.length === 1
        ? selected[0]
        : `${label} (${selected.length})`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex min-w-[140px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
          open || selected.length > 0
            ? "border-green-900 bg-green-950/30 text-neutral-300"
            : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-700"
        )}
      >
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-neutral-600 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 min-w-[200px] rounded-xl border border-neutral-800 bg-black py-1 shadow-xl shadow-black/60">
          <div className="border-b border-neutral-900 px-3 py-2">
            <p className="text-xs font-medium text-neutral-500">{label}</p>
          </div>
          <ul className="max-h-64 overflow-y-auto scrollbar-thin py-1">
            {options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-green-950/50 text-neutral-300"
                        : "text-neutral-500 hover:bg-neutral-950 hover:text-neutral-400"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isSelected
                          ? "border-green-900 bg-green-950 text-neutral-400"
                          : "border-neutral-700 bg-black"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    {option}
                  </button>
                </li>
              );
            })}
          </ul>
          {selected.length > 0 && (
            <div className="border-t border-neutral-900 p-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-lg px-2 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-950 hover:text-neutral-400"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
