"use client";

import { Check, ChevronDown, Star } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  QUALITY_RATING_LABELS,
  type FacilityQualityFilter,
  type FacilityQualityRating,
} from "./map-types";

type QualityRatingValue = FacilityQualityFilter;
type RatedOrUnratedValue = Exclude<QualityRatingValue, "">;

type QualityRatingSelectProps = {
  labelledBy: string;
  value: QualityRatingValue;
  onChange: (value: QualityRatingValue) => void;
};

const OPTIONS: Array<{ value: QualityRatingValue; label: string }> = [
  { value: "", label: "Todas" },
  ...(Object.entries(QUALITY_RATING_LABELS) as Array<[FacilityQualityRating, string]>).map(
    ([value, label]) => ({ value, label }),
  ),
  { value: "unrated", label: "Sin calificar" },
];

function QualityRatingMarker({ value }: { value: RatedOrUnratedValue }) {
  return (
    <i className={`registryQualityDot registryQualityDot-${value}`} aria-hidden="true">
      {value === "outstanding" && <Star size={9} strokeWidth={2.4} fill="currentColor" />}
    </i>
  );
}

export function QualityRatingSelect({ labelledBy, value, onChange }: QualityRatingSelectProps) {
  const listboxId = useId();
  const triggerId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, OPTIONS.findIndex((option) => option.value === value));
  const selected = useMemo(() => OPTIONS[selectedIndex], [selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, selectedIndex]);

  function closeAndFocusTrigger() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function focusOption(index: number) {
    const nextIndex = (index + OPTIONS.length) % OPTIONS.length;
    optionRefs.current[nextIndex]?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setOpen(true);
    const index = event.key === "End"
      ? OPTIONS.length - 1
      : event.key === "Home"
        ? 0
        : event.key === "ArrowUp"
          ? Math.max(selectedIndex - 1, 0)
          : Math.min(selectedIndex + 1, OPTIONS.length - 1);
    window.requestAnimationFrame(() => optionRefs.current[index]?.focus());
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndFocusTrigger();
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") focusOption(0);
    else if (event.key === "End") focusOption(OPTIONS.length - 1);
    else focusOption(index + (event.key === "ArrowDown" ? 1 : -1));
  }

  return (
    <div className="registryQualitySelect" ref={rootRef}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="registryQualitySelectTrigger"
        aria-labelledby={`${labelledBy} ${triggerId}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>
          {selected.value && <QualityRatingMarker value={selected.value} />}
          {selected.label}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>

      {open && (
        <div id={listboxId} className="registryQualityOptions" role="listbox" aria-labelledby={labelledBy}>
          {OPTIONS.map((option, index) => (
            <button
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className="registryQualityOption"
              key={option.value || "all"}
              onClick={() => {
                onChange(option.value);
                closeAndFocusTrigger();
              }}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
            >
              <span>
                {option.value && <QualityRatingMarker value={option.value} />}
                {option.label}
              </span>
              {option.value === value && <Check size={17} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
