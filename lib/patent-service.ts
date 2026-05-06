import { mockPatentDetails } from "@/lib/mock-data";
import { PatentDetail, PatentDetailResponse, PatentSummary, SearchParams, SearchResponse } from "@/lib/types";
import { cleanPatentNumber, compactText, decodeHtmlEntities, isPatentNumberLike, normalizeSearchParams } from "@/lib/utils";

const SERPAPI_URL = "https://serpapi.com/search.json";
const PAPAGO_URL = "https://openapi.naver.com/v1/papago/n2mt";

const MOCK_LATENCY_MS = 140;
const SERPAPI_MIN_PAGE_SIZE = 10;

type SerpApiSearchResponse = {
  organic_results?: SerpApiOrganicResult[];
  search_information?: {
    total_results?: number;
  };
  search_metadata?: {
    total_time_taken?: number;
  };
  error?: string;
};

type SerpApiOrganicResult = {
  patent_id?: string;
  publication_number?: string;
  application_number?: string;
  title?: string;
  snippet?: string;
  assignee?: string;
  filing_date?: string;
  publication_date?: string;
  patent_link?: string;
};

type SerpApiDetailsResponse = {
  patent_id?: string;
  publication_number?: string;
  application_number?: string;
  title?: string;
  assignee?: string;
  assignees?: Array<string | { name?: string }>;
  inventors?: Array<string | { name?: string }>;
  filing_date?: string;
  publication_date?: string;
  abstract?: string;
  abstract_original?: string;
  classifications?: Array<string | { code?: string }>;
  patent_link?: string;
  search_metadata?: {
    total_time_taken?: number;
  };
  error?: string;
};

function hasSerpApiCredentials() {
  return Boolean(process.env.SERPAPI_API_KEY);
}

function hasPapagoCredentials() {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

function toSummary(detail: PatentDetail): PatentSummary {
  return {
    id: detail.id,
    publicationNumber: detail.publicationNumber,
    applicationNumber: detail.applicationNumber,
    titleJa: detail.titleJa,
    titleKo: detail.titleKo,
    applicant: detail.applicant,
    applicationDate: detail.applicationDate,
    publicationDate: detail.publicationDate,
    ipcClasses: detail.ipcClasses,
    country: detail.country,
  };
}

function filterMockPatents(params: SearchParams) {
  const normalizedKeyword = params.q?.toLowerCase();
  const normalizedPatentNumber = params.patentNumber ? cleanPatentNumber(params.patentNumber) : undefined;
  const normalizedIpc = params.ipc?.toLowerCase();

  return mockPatentDetails.filter((item) => {
    const keywordMatched =
      !normalizedKeyword ||
      [
        item.publicationNumber,
        item.applicationNumber,
        item.titleJa,
        item.titleKo,
        item.applicant,
        item.abstractJa,
        item.abstractKo,
        ...item.inventors,
        ...item.ipcClasses,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword);

    const patentNumberMatched =
      !normalizedPatentNumber ||
      cleanPatentNumber(item.publicationNumber).includes(normalizedPatentNumber) ||
      cleanPatentNumber(item.applicationNumber).includes(normalizedPatentNumber);

    const ipcMatched =
      !normalizedIpc || item.ipcClasses.some((ipc) => ipc.toLowerCase().startsWith(normalizedIpc));

    const fromMatched = !params.dateFrom || item.applicationDate >= params.dateFrom;
    const toMatched = !params.dateTo || item.applicationDate <= params.dateTo;

    return keywordMatched && patentNumberMatched && ipcMatched && fromMatched && toMatched;
  });
}

async function searchMockPatents(params: SearchParams): Promise<SearchResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? SERPAPI_MIN_PAGE_SIZE;
  const items = filterMockPatents(params).sort((a, b) => b.publicationDate.localeCompare(a.publicationDate));
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize).map(toSummary);

  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

  return {
    items: paged,
    totalResults: items.length,
    page,
    pageSize,
    elapsedMs: MOCK_LATENCY_MS,
    source: "mock",
    notice: "SERPAPI_API_KEY가 없어 샘플 데이터로 응답했습니다.",
  };
}

async function getMockPatentDetail(id: string): Promise<PatentDetailResponse> {
  const matched =
    mockPatentDetails.find((item) => cleanPatentNumber(item.id) === cleanPatentNumber(id)) ??
    mockPatentDetails.find((item) => cleanPatentNumber(item.publicationNumber) === cleanPatentNumber(id));

  if (!matched) {
    throw new Error("특허를 찾을 수 없습니다.");
  }

  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

  return {
    item: matched,
    source: "mock",
    notice: "SERPAPI_API_KEY가 없어 샘플 상세 데이터를 보여주고 있습니다.",
  };
}

async function translateText(text: string): Promise<string> {
  if (!text) return text;
  if (!hasPapagoCredentials()) return text;

  const body = new URLSearchParams({
    source: "ja",
    target: "ko",
    text,
  });

  const response = await fetch(PAPAGO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID as string,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET as string,
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Papago translation failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    message?: { result?: { translatedText?: string } };
  };

  return payload.message?.result?.translatedText ?? text;
}

async function fetchSerpApi<T extends { error?: string }>(params: Record<string, string | number | undefined>): Promise<T> {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    query.set(key, String(value));
  }

  query.set("api_key", process.env.SERPAPI_API_KEY as string);

  const response = await fetch(`${SERPAPI_URL}?${query.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`SerpAPI request failed: ${response.status}`);
  }

  const payload = (await response.json()) as T;
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}

function normalizeDate(value?: string): string {
  if (!value) return "";
  return /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
}

function normalizePatentId(id: string): string {
  return id.startsWith("patent/") ? id : `patent/${cleanPatentNumber(id)}`;
}

function getPublicationNumber(value?: string): string {
  if (!value) return "";
  const normalized = value.replace(/^patent\//i, "").split("/")[0] ?? value;
  return cleanPatentNumber(normalized);
}

function extractNames(values?: Array<string | { name?: string }>): string[] {
  if (!values) return [];

  return values
    .map((value) => (typeof value === "string" ? value : value.name ?? ""))
    .map((value) => compactText(decodeHtmlEntities(value)))
    .filter(Boolean);
}

function extractClassificationCodes(values?: Array<string | { code?: string }>): string[] {
  if (!values) return [];

  return values
    .map((value) => (typeof value === "string" ? value : value.code ?? ""))
    .map((value) => compactText(value))
    .filter(Boolean);
}

function buildGooglePatentsUrl(publicationNumber: string): string {
  return `https://patents.google.com/patent/${cleanPatentNumber(publicationNumber)}`;
}

function buildSearchQuery(params: SearchParams): string {
  const queryParts = [params.q?.trim(), params.patentNumber ? cleanPatentNumber(params.patentNumber) : undefined, params.ipc?.trim()]
    .filter(Boolean)
    .map((value) => value!.replaceAll('"', " "));

  return queryParts.length > 0 ? queryParts.join(" ") : "JP";
}

function getPatentNumberCandidate(params: SearchParams): string | undefined {
  if (params.patentNumber?.trim()) {
    return params.patentNumber.trim();
  }

  if (params.q?.trim() && isPatentNumberLike(params.q)) {
    return params.q.trim();
  }

  return undefined;
}

function matchesSearchFilters(item: PatentSummary, params: SearchParams): boolean {
  const normalizedIpc = params.ipc?.toLowerCase();
  const fromMatched = !params.dateFrom || item.applicationDate >= params.dateFrom;
  const toMatched = !params.dateTo || item.applicationDate <= params.dateTo;
  const ipcMatched =
    !normalizedIpc || item.ipcClasses.some((ipc) => ipc.toLowerCase().startsWith(normalizedIpc));

  return fromMatched && toMatched && ipcMatched;
}

async function tryDirectPatentNumberSearch(params: SearchParams): Promise<SearchResponse | null> {
  const candidate = getPatentNumberCandidate(params);
  if (!candidate) return null;

  try {
    const startedAt = Date.now();
    const detail = await fetchSerpApiDetail(candidate);
    const summary = toSummary(detail.item);

    if (!matchesSearchFilters(summary, params)) {
      return {
        items: [],
        totalResults: 0,
        page: params.page ?? 1,
        pageSize: Math.max(params.pageSize ?? SERPAPI_MIN_PAGE_SIZE, SERPAPI_MIN_PAGE_SIZE),
        elapsedMs: Date.now() - startedAt,
        source: "serpapi",
        notice: "특허번호로 직접 조회했지만 현재 날짜 또는 IPC 조건에는 맞지 않았습니다.",
      };
    }

    const notices = ["특허번호 형식의 검색어로 판단해 상세 API에서 직접 조회했습니다."];
    if (detail.notice) {
      notices.push(detail.notice);
    }

    return {
      items: [summary],
      totalResults: 1,
      page: params.page ?? 1,
      pageSize: Math.max(params.pageSize ?? SERPAPI_MIN_PAGE_SIZE, SERPAPI_MIN_PAGE_SIZE),
      elapsedMs: Date.now() - startedAt,
      source: "serpapi",
      notice: notices.join(" "),
    };
  } catch (error) {
    console.error("[SerpAPI] direct patent lookup failed", {
      candidate,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function fetchSerpApiDetailByPatentId(patentId: string): Promise<SerpApiDetailsResponse> {
  return fetchSerpApi<SerpApiDetailsResponse>({
    engine: "google_patents_details",
    patent_id: patentId,
  });
}

async function mapSearchResultToSummary(item: SerpApiOrganicResult): Promise<PatentSummary> {
  const fallbackPublicationNumber =
    cleanPatentNumber(item.publication_number ?? item.application_number ?? getPublicationNumber(item.patent_id) ?? "JP");
  const patentId = item.patent_id ? normalizePatentId(item.patent_id) : normalizePatentId(fallbackPublicationNumber);

  try {
    const detail = await fetchSerpApiDetailByPatentId(patentId);
    const publicationNumber = cleanPatentNumber(
      detail.publication_number ?? item.publication_number ?? getPublicationNumber(detail.patent_id) ?? fallbackPublicationNumber,
    );
    const titleJa = compactText(decodeHtmlEntities(detail.title ?? item.title ?? "제목 없음"));
    const titleKo = await translateText(titleJa);

    return {
      id: publicationNumber,
      publicationNumber,
      applicationNumber: cleanPatentNumber(detail.application_number ?? item.application_number ?? publicationNumber),
      titleJa,
      titleKo,
      applicant:
        compactText(
          decodeHtmlEntities(
            detail.assignee ??
              extractNames(detail.assignees)[0] ??
              item.assignee ??
              "출원인 정보 없음",
          ),
        ) || "출원인 정보 없음",
      applicationDate: normalizeDate(detail.filing_date ?? item.filing_date),
      publicationDate: normalizeDate(detail.publication_date ?? item.publication_date),
      ipcClasses: extractClassificationCodes(detail.classifications).slice(0, 5),
      country: "JP",
    };
  } catch {
    const titleJa = compactText(decodeHtmlEntities(item.title ?? "제목 없음"));
    const titleKo = await translateText(titleJa);

    return {
      id: fallbackPublicationNumber,
      publicationNumber: fallbackPublicationNumber,
      applicationNumber: cleanPatentNumber(item.application_number ?? fallbackPublicationNumber),
      titleJa,
      titleKo,
      applicant: compactText(decodeHtmlEntities(item.assignee ?? "출원인 정보 없음")) || "출원인 정보 없음",
      applicationDate: normalizeDate(item.filing_date),
      publicationDate: normalizeDate(item.publication_date),
      ipcClasses: [],
      country: "JP",
    };
  }
}

async function fetchSerpApiSearch(params: SearchParams): Promise<SearchResponse> {
  const directSearch = await tryDirectPatentNumberSearch(params);
  if (directSearch) {
    return directSearch;
  }

  const page = params.page ?? 1;
  const pageSize = Math.max(params.pageSize ?? SERPAPI_MIN_PAGE_SIZE, SERPAPI_MIN_PAGE_SIZE);
  const startedAt = Date.now();

  const response = await fetchSerpApi<SerpApiSearchResponse>({
    engine: "google_patents",
    q: buildSearchQuery(params),
    page,
    num: pageSize,
    language: "JAPANESE",
    country: "JP",
    after: params.dateFrom,
    before: params.dateTo,
  });

  const mapped = await Promise.all((response.organic_results ?? []).map((item) => mapSearchResultToSummary(item)));
  const normalizedIpc = params.ipc?.toLowerCase();
  const items = normalizedIpc
    ? mapped.filter((item) => item.ipcClasses.some((ipc) => ipc.toLowerCase().startsWith(normalizedIpc)))
    : mapped;

  const notices: string[] = [];
  if (params.ipc) {
    notices.push("IPC 필터는 SerpAPI 검색 결과와 상세 분류 정보를 함께 사용해 적용했습니다.");
  }
  if (!hasPapagoCredentials()) {
    notices.push("Papago 키가 없어 번역은 원문 기준으로 표시합니다.");
  }

  return {
    items,
    totalResults: normalizedIpc ? items.length : response.search_information?.total_results ?? items.length,
    page,
    pageSize,
    elapsedMs:
      Math.round((response.search_metadata?.total_time_taken ?? (Date.now() - startedAt) / 1000) * 1000),
    source: "serpapi",
    notice: notices.length > 0 ? notices.join(" ") : undefined,
  };
}

async function fetchSerpApiDetail(id: string): Promise<PatentDetailResponse> {
  const detail = await fetchSerpApiDetailByPatentId(normalizePatentId(id));
  const publicationNumber = cleanPatentNumber(detail.publication_number ?? getPublicationNumber(detail.patent_id) ?? id);
  const titleJa = compactText(decodeHtmlEntities(detail.title ?? "제목 없음"));
  const abstractJa = compactText(decodeHtmlEntities(detail.abstract_original ?? detail.abstract ?? "요약 정보 없음"));
  const [titleKo, abstractKo] = await Promise.all([translateText(titleJa), translateText(abstractJa)]);
  const assignees = extractNames(detail.assignees);
  const inventors = extractNames(detail.inventors);
  const notices: string[] = [];

  if (!hasPapagoCredentials()) {
    notices.push("Papago 키가 없어 번역은 원문 기준으로 표시합니다.");
  }

  return {
    item: {
      id: publicationNumber,
      publicationNumber,
      applicationNumber: cleanPatentNumber(detail.application_number ?? publicationNumber),
      titleJa,
      titleKo,
      applicant:
        compactText(
          decodeHtmlEntities(detail.assignee ?? assignees[0] ?? "출원인 정보 없음"),
        ) || "출원인 정보 없음",
      applicationDate: normalizeDate(detail.filing_date),
      publicationDate: normalizeDate(detail.publication_date),
      ipcClasses: extractClassificationCodes(detail.classifications).slice(0, 5),
      country: "JP",
      inventors: inventors.length > 0 ? inventors : ["발명자 정보 없음"],
      abstractJa,
      abstractKo,
      jPlatPatUrl: "https://www.j-platpat.inpit.go.jp/",
      espacenetUrl: detail.patent_link ?? buildGooglePatentsUrl(publicationNumber),
    },
    source: "serpapi",
    notice: notices.length > 0 ? notices.join(" ") : undefined,
  };
}

export async function searchPatents(input: SearchParams): Promise<SearchResponse> {
  const params = normalizeSearchParams(input);

  if (!hasSerpApiCredentials()) {
    return searchMockPatents(params);
  }

  try {
    return await fetchSerpApiSearch(params);
  } catch (error) {
    console.error("[SerpAPI] search failed", {
      params,
      message: error instanceof Error ? error.message : String(error),
    });
    const fallback = await searchMockPatents(params);
    return {
      ...fallback,
      notice: `실시간 SerpAPI 검색에 실패하여 샘플 결과로 대체했습니다. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
    };
  }
}

export async function getPatentDetail(id: string): Promise<PatentDetailResponse> {
  if (!hasSerpApiCredentials()) {
    return getMockPatentDetail(id);
  }

  try {
    return await fetchSerpApiDetail(id);
  } catch (error) {
    console.error("[SerpAPI] detail failed", {
      id,
      message: error instanceof Error ? error.message : String(error),
    });
    const fallback = await getMockPatentDetail(id);
    return {
      ...fallback,
      notice: `실시간 SerpAPI 상세 조회에 실패하여 샘플 데이터로 대체했습니다. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
    };
  }
}

export async function translateTextToKorean(text: string) {
  try {
    return await translateText(text);
  } catch {
    return text;
  }
}
