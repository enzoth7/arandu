"use client";

import { useEffect, useMemo, useState } from "react";
import { departmentOptions, filterFacilities, sortFacilities } from "../../lib/facility-search.mjs";
import { facilityHaystack } from "../components/facility-presentation";
import { canonicalDepartment, foldText } from "../../lib/uruguay.mjs";
import type { Facility, FacilityStatus } from "../components/map-types";

export type MonthlyPriceRange = { min: number; max: number };

export function useFacilityFilters(facilities: Facility[]) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [monthlyPriceRange, setMonthlyPriceRange] = useState<MonthlyPriceRange | null>(null);
  const [status, setStatus] = useState<"" | FacilityStatus>("");

  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const facility of facilities) map.set(facility.id, facilityHaystack(facility));
    return map;
  }, [facilities]);
  const haystackFor = useMemo(
    () => (facility: Facility) => haystacks.get(facility.id) ?? facilityHaystack(facility),
    [haystacks],
  );
  const foldedQuery = useMemo(() => foldText(query), [query]);

  const monthlyPriceBounds = useMemo<MonthlyPriceRange | null>(() => {
    const prices = facilities
      .map((facility) => facility.monthlyPriceUyu)
      .filter((price): price is number => typeof price === "number" && Number.isFinite(price) && price > 0);
    if (!prices.length) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [facilities]);

  useEffect(() => {
    setMonthlyPriceRange((current) => {
      if (!current || !monthlyPriceBounds) return monthlyPriceBounds ? current : null;
      const next = {
        min: Math.max(monthlyPriceBounds.min, Math.min(current.min, monthlyPriceBounds.max)),
        max: Math.max(monthlyPriceBounds.min, Math.min(current.max, monthlyPriceBounds.max)),
      };
      if (next.min > next.max) next.min = next.max;
      return next.min === current.min && next.max === current.max ? current : next;
    });
  }, [monthlyPriceBounds]);

  const activeMonthlyPriceRange = monthlyPriceRange
    && monthlyPriceBounds
    && (monthlyPriceRange.min > monthlyPriceBounds.min || monthlyPriceRange.max < monthlyPriceBounds.max)
    ? monthlyPriceRange
    : null;

  const withoutDepartment = useMemo(
    () => filterFacilities(
      facilities,
      {
        foldedQuery,
        status,
        monthlyPriceMin: activeMonthlyPriceRange?.min,
        monthlyPriceMax: activeMonthlyPriceRange?.max,
        canonicalDepartmentOf: canonicalDepartment,
      },
      haystackFor,
    ),
    [facilities, foldedQuery, status, activeMonthlyPriceRange, haystackFor],
  );
  const matched = useMemo(
    () => filterFacilities(
      withoutDepartment,
      {
        department,
        monthlyPriceMin: activeMonthlyPriceRange?.min,
        monthlyPriceMax: activeMonthlyPriceRange?.max,
        canonicalDepartmentOf: canonicalDepartment,
      },
      haystackFor,
    ),
    [withoutDepartment, department, activeMonthlyPriceRange, haystackFor],
  );
  const visible = useMemo(() => sortFacilities(matched, "name"), [matched]);
  const departments = useMemo(
    () => departmentOptions(withoutDepartment, canonicalDepartment),
    [withoutDepartment],
  );
  const summaryScope = useMemo(
    () => filterFacilities(
      facilities,
      {
        foldedQuery,
        department,
        monthlyPriceMin: activeMonthlyPriceRange?.min,
        monthlyPriceMax: activeMonthlyPriceRange?.max,
        canonicalDepartmentOf: canonicalDepartment,
      },
      haystackFor,
    ),
    [facilities, foldedQuery, department, activeMonthlyPriceRange, haystackFor],
  );
  const hasActiveFilters = Boolean(query || department || status || activeMonthlyPriceRange);

  function reset() {
    setQuery("");
    setDepartment("");
    setMonthlyPriceRange(null);
    setStatus("");
  }

  return {
    query, setQuery,
    department, setDepartment,
    monthlyPriceBounds,
    monthlyPriceRange: monthlyPriceRange ?? monthlyPriceBounds,
    setMonthlyPriceRange,
    status, setStatus,
    visible,
    departments,
    summaryScope,
    hasActiveFilters,
    reset,
  };
}
