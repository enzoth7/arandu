"use client";

import { useEffect, useMemo, useState } from "react";
import {
  departmentOptions,
  filterFacilities,
  prioritizeFacility,
  sortFacilities,
  sortFacilitiesByPrice,
} from "../../lib/facility-search.mjs";
import { facilityHaystack } from "../components/facility-presentation";
import { canonicalDepartment, foldText } from "../../lib/uruguay.mjs";
import type { Facility, FacilityQualityFilter, FacilityStatus } from "../components/map-types";

export type MonthlyPriceRange = { min: number; max: number };
export type PriceOrder = "" | "asc" | "desc";
export type PhotoAvailability = "" | "with" | "without";

export function useFacilityFilters(facilities: Facility[]) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [monthlyPriceRange, setMonthlyPriceRange] = useState<MonthlyPriceRange | null>(null);
  const [status, setStatus] = useState<"" | FacilityStatus>("");
  const [qualityRating, setQualityRating] = useState<FacilityQualityFilter>("");
  const [priceOrder, setPriceOrder] = useState<PriceOrder>("");
  const [photoAvailability, setPhotoAvailability] = useState<PhotoAvailability>("");

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
        qualityRating,
        photoAvailability,
        monthlyPriceMin: activeMonthlyPriceRange?.min,
        monthlyPriceMax: activeMonthlyPriceRange?.max,
        canonicalDepartmentOf: canonicalDepartment,
      },
      haystackFor,
    ),
    [facilities, foldedQuery, status, qualityRating, photoAvailability, activeMonthlyPriceRange, haystackFor],
  );
  const matched = useMemo(
    () => filterFacilities(
      withoutDepartment,
      {
        department,
        canonicalDepartmentOf: canonicalDepartment,
      },
      haystackFor,
    ),
    [withoutDepartment, department, haystackFor],
  );
  const visible = useMemo<Facility[]>(
    () => priceOrder
      ? sortFacilitiesByPrice(matched, priceOrder)
      : prioritizeFacility(sortFacilities(matched, "name"), "DEMO-ELEPEM-001"),
    [matched, priceOrder],
  );
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
        qualityRating,
        photoAvailability,
        monthlyPriceMin: activeMonthlyPriceRange?.min,
        monthlyPriceMax: activeMonthlyPriceRange?.max,
        canonicalDepartmentOf: canonicalDepartment,
      },
      haystackFor,
    ),
    [facilities, foldedQuery, department, qualityRating, photoAvailability, activeMonthlyPriceRange, haystackFor],
  );
  const hasActiveFilters = Boolean(
    query || department || status || qualityRating || activeMonthlyPriceRange || priceOrder || photoAvailability,
  );

  function reset() {
    setQuery("");
    setDepartment("");
    setMonthlyPriceRange(null);
    setStatus("");
    setQualityRating("");
    setPriceOrder("");
    setPhotoAvailability("");
  }

  return {
    query, setQuery,
    department, setDepartment,
    monthlyPriceBounds,
    monthlyPriceRange: monthlyPriceRange ?? monthlyPriceBounds,
    setMonthlyPriceRange,
    status, setStatus,
    qualityRating, setQualityRating,
    priceOrder, setPriceOrder,
    photoAvailability, setPhotoAvailability,
    visible,
    departments,
    summaryScope,
    hasActiveFilters,
    reset,
  };
}
