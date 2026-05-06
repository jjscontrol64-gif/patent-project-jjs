import { SearchParams } from "@/lib/types";

export function cleanPatentNumber(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function isPatentNumberLike(input: string): boolean {
  const value = cleanPatentNumber(input);
  return /^JP?\d{4,}[-A-Z0-9]*$/i.test(value) || /^JP\d{4,}/i.test(value);
}

export function formatDateLabel(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}-${month}-${day}`;
}

export function createSearchHref(params: SearchParams): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.patentNumber) search.set("patentNumber", params.patentNumber);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.ipc) search.set("ipc", params.ipc);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.pageSize && params.pageSize !== 10) search.set("pageSize", String(params.pageSize));
  return `/search?${search.toString()}`;
}

export function buildDetailBackHref(searchParams: SearchParams): string {
  const hasSearchContext =
    searchParams.q || searchParams.patentNumber || searchParams.dateFrom || searchParams.dateTo || searchParams.ipc;
  if (!hasSearchContext) return "/";
  return createSearchHref(searchParams);
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

export function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeSearchParams(
  input: Record<string, string | string[] | undefined> | URLSearchParams | SearchParams,
): SearchParams {
  const getValue = (key: string): string | undefined => {
    if (input instanceof URLSearchParams) return input.get(key) ?? undefined;
    const raw = input[key as keyof typeof input];
    if (typeof raw === "number") return String(raw);
    return Array.isArray(raw) ? raw[0] : raw;
  };

  const page = Number(getValue("page") ?? "1");
  const pageSize = Number(getValue("pageSize") ?? "10");

  return {
    q: getValue("q")?.trim() || undefined,
    patentNumber: getValue("patentNumber")?.trim() || undefined,
    dateFrom: getValue("dateFrom")?.trim() || undefined,
    dateTo: getValue("dateTo")?.trim() || undefined,
    ipc: getValue("ipc")?.trim() || undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize >= 10 && pageSize <= 20 ? pageSize : 10,
  };
}
