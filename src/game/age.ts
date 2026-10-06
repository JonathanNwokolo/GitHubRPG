export interface AccountAge {
  /** Completed anniversaries. */
  wholeYears: number;
  /** wholeYears + fraction of the current year (0 <= fraction < 1). */
  years: number;
}

function addYearsUtc(ms: number, years: number): number {
  const d = new Date(ms);
  return Date.UTC(
    d.getUTCFullYear() + years,
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  );
}

/**
 * Account age computed from the full dates, never from `currentYear - creationYear`.
 * A Feb-29 account has its anniversary on Mar-1 in non-leap years (Date.UTC overflow).
 */
export function calculateAccountAge(createdAtIso: string, referenceIso: string): AccountAge {
  const created = Date.parse(createdAtIso);
  const reference = Date.parse(referenceIso);
  if (Number.isNaN(created) || Number.isNaN(reference) || reference <= created) {
    return { wholeYears: 0, years: 0 };
  }

  let whole = new Date(reference).getUTCFullYear() - new Date(created).getUTCFullYear();
  while (whole > 0 && addYearsUtc(created, whole) > reference) whole--;

  const lastAnniversary = addYearsUtc(created, whole);
  const nextAnniversary = addYearsUtc(created, whole + 1);
  const fraction = (reference - lastAnniversary) / (nextAnniversary - lastAnniversary);
  return { wholeYears: whole, years: whole + fraction };
}
