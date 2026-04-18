import {
  formatDuration,
  formatDate,
  formatDateLong,
  formatDateWeekday,
  formatWeekdayName,
  formatMonth,
  formatTime,
  formatCurrency,
  toLocalDatetime,
  toLocalMs,
  fromLocalDatetime,
  toDateString,
} from "./formatters";

describe("formatDuration", () => {
  it("returns 0:00:00.000 for null", () => {
    expect(formatDuration(null)).toBe("0:00:00.000");
  });

  it("returns 0:00:00.000 for 0", () => {
    expect(formatDuration(0)).toBe("0:00:00.000");
  });

  it("formats sub-second values", () => {
    expect(formatDuration(456)).toBe("0:00:00.456");
  });

  it("formats seconds only", () => {
    expect(formatDuration(5000)).toBe("0:00:05.000");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90000)).toBe("0:01:30.000");
  });

  it("formats exact hours", () => {
    expect(formatDuration(3600000)).toBe("1:00:00.000");
  });

  it("formats hours, minutes, seconds, and milliseconds", () => {
    expect(formatDuration(3661456)).toBe("1:01:01.456");
  });

  it("pads minutes and seconds to 2 digits", () => {
    expect(formatDuration(61000)).toBe("0:01:01.000");
  });

  it("pads milliseconds to 3 digits", () => {
    expect(formatDuration(1001)).toBe("0:00:01.001");
  });

  it("handles large values", () => {
    expect(formatDuration(360000000)).toBe("100:00:00.000");
  });
});

describe("formatDate", () => {
  it("formats ISO datetime to short date with year", () => {
    const result = formatDate("2026-01-15T09:30:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });

  it("formats date-only string without UTC rollback", () => {
    const result = formatDate("2026-04-11");
    expect(result).toContain("Apr");
    expect(result).toContain("11");
  });

  it("handles end-of-year dates", () => {
    const result = formatDate("2026-12-31");
    expect(result).toContain("Dec");
    expect(result).toContain("31");
  });
});

describe("formatDateLong", () => {
  it("formats to long date with full month name", () => {
    const result = formatDateLong("2026-01-15");
    expect(result).toContain("January");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });
});

describe("formatDateWeekday", () => {
  it("formats with weekday abbreviation and no year", () => {
    const result = formatDateWeekday("2026-04-11");
    expect(result).toContain("Sat");
    expect(result).toContain("Apr");
    expect(result).toContain("11");
  });
});

describe("formatWeekdayName", () => {
  it("returns full weekday name", () => {
    expect(formatWeekdayName("2026-04-11")).toBe("Saturday");
  });

  it("returns correct day for a Monday", () => {
    expect(formatWeekdayName("2026-04-13")).toBe("Monday");
  });
});

describe("formatMonth", () => {
  it("returns short month from Date object", () => {
    expect(formatMonth(new Date(2026, 0, 1))).toBe("Jan");
  });

  it("returns correct month for December", () => {
    expect(formatMonth(new Date(2026, 11, 1))).toBe("Dec");
  });
});

describe("formatTime", () => {
  it("formats morning time", () => {
    const result = formatTime("2026-04-11T09:30:00Z");
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
  });

  it("formats afternoon time", () => {
    const result = formatTime("2026-04-11T14:00:00Z");
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
  });
});

describe("formatCurrency", () => {
  it("formats number input", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats string input", () => {
    expect(formatCurrency("1234.56")).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large values with commas", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(1.999)).toBe("$2.00");
  });
});

describe("toLocalDatetime", () => {
  it("includes seconds in output", () => {
    const result = toLocalDatetime("2026-04-11T14:30:45.000Z");
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("preserves the correct second value", () => {
    const result = toLocalDatetime("2026-04-11T14:30:45.000Z");
    const seconds = result.split(":")[2];
    expect(seconds).toBe("45");
  });
});

describe("toLocalMs", () => {
  it("extracts milliseconds from ISO string", () => {
    expect(toLocalMs("2026-04-11T14:30:45.456Z")).toBe(456);
  });

  it("returns 0 when no milliseconds", () => {
    expect(toLocalMs("2026-04-11T14:30:45.000Z")).toBe(0);
  });
});

describe("fromLocalDatetime", () => {
  it("converts datetime-local to ISO string", () => {
    const result = fromLocalDatetime("2026-04-11T10:30:00");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result).toContain("Z");
  });

  it("includes milliseconds when provided", () => {
    const result = fromLocalDatetime("2026-04-11T10:30:00", 456);
    expect(result).toContain(".456Z");
  });

  it("defaults milliseconds to 0", () => {
    const result = fromLocalDatetime("2026-04-11T10:30:00");
    expect(result).toContain(".000Z");
  });
});

describe("toLocalDatetime/fromLocalDatetime round-trip", () => {
  it("preserves time through round-trip", () => {
    const original = "2026-04-11T14:30:45.000Z";
    const local = toLocalDatetime(original);
    const roundTripped = fromLocalDatetime(local);
    expect(new Date(roundTripped).getTime()).toBe(
      new Date(original).getTime(),
    );
  });

  it("preserves seconds through round-trip", () => {
    const original = "2026-04-11T14:30:45.000Z";
    const local = toLocalDatetime(original);
    const roundTripped = fromLocalDatetime(local);
    expect(new Date(roundTripped).getUTCSeconds()).toBe(45);
  });

  it("preserves milliseconds through round-trip with toLocalMs", () => {
    const original = "2026-04-11T14:30:45.789Z";
    const local = toLocalDatetime(original);
    const ms = toLocalMs(original);
    const roundTripped = fromLocalDatetime(local, ms);
    expect(new Date(roundTripped).getTime()).toBe(
      new Date(original).getTime(),
    );
  });
});

describe("toDateString", () => {
  it("formats Date to YYYY-MM-DD", () => {
    expect(toDateString(new Date(2026, 5, 15))).toBe("2026-06-15");
  });

  it("pads single-digit month and day", () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
