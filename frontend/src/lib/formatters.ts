export function formatVnd(value: number | null | undefined, compact = false) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(2)} tỷ`;
    }
    if (Math.abs(value) >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)} triệu`;
    }
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function shortenedLabel(value?: string) {
  if (!value) return "";
  return value.replace("Quận ", "").replace("Huyện ", "").replace("Thị xã ", "");
}

export function knownLocation(...values: Array<string | undefined>) {
  return values.find((value) => value && value !== "Unknown") ?? "Chưa xác định";
}
