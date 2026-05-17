import { mockPatentDetails } from "@/lib/mock-data";
import { PatentDetail, PatentDetailResponse, PatentSummary, SearchParams, SearchResponse } from "@/lib/types";
import { cleanPatentNumber, compactText, decodeHtmlEntities, normalizeSearchParams } from "@/lib/utils";

const PATENT_API_BASE_URL = process.env.PATENT_API_BASE_URL ?? "http://localhost:8080";

const MOCK_LATENCY_MS = 140;
const DEFAULT_PAGE_SIZE = 10;

type PatentApiItem = {
  id?: string;
  title?: string;
  titleJa?: string;
  titleKo?: string;
  translatedTitle?: string;
  titleTranslated?: string;
  applicant?: string;
  filingDate?: string;
  publicationNumber?: string;
};

type PatentApiSearchResponse = {
  query?: string;
  page?: number;
  size?: number;
  totalCount?: number;
  items?: PatentApiItem[];
};

type PatentApiDetailResponse = {
  id?: string;
  title?: string;
  titleJa?: string;
  titleKo?: string;
  translatedTitle?: string;
  titleTranslated?: string;
  abstract?: string;
  abstractText?: string;
  abstractJa?: string;
  abstractKo?: string;
  translatedAbstract?: string;
  abstractTranslated?: string;
  applicant?: string;
  filingDate?: string;
  publicationNumber?: string;
  originalUrl?: string;
};

type PatentApiTranslateResponse = {
  source?: string;
  target?: string;
  text?: string;
  translatedText?: string;
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function decodeAndCompact(value: string): string {
  return compactText(decodeHtmlEntities(value));
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
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
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
    notice: "patent-api에 연결할 수 없어 샘플 데이터로 응답했습니다.",
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
    notice: "patent-api에 연결할 수 없어 샘플 상세 데이터를 보여주고 있습니다.",
  };
}

async function fetchPatentApiSearch(params: SearchParams): Promise<SearchResponse> {
  const page = params.page ?? 1;
  const size = Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE);
  const startedAt = Date.now();

  const queryParts = [
    params.q?.trim(),
    params.patentNumber ? cleanPatentNumber(params.patentNumber) : undefined,
  ].filter(Boolean);
  const query = queryParts.length > 0 ? queryParts.join(" ") : "JP";

  const qs = new URLSearchParams({ query, page: String(page), size: String(size) });
  if (params.dateFrom) qs.set("from", params.dateFrom.replaceAll("-", ""));
  if (params.dateTo) qs.set("to", params.dateTo.replaceAll("-", ""));

  const response = await fetch(`${PATENT_API_BASE_URL}/api/patents/search?${qs.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`patent-api search failed: ${response.status}`);
  }

  const data = (await response.json()) as PatentApiSearchResponse;
  const rawItems = data.items ?? [];

  const summaries: PatentSummary[] = rawItems.map((item) => {
    const publicationNumber = cleanPatentNumber(item.publicationNumber ?? item.id ?? "");
    const fallbackTitle = item.title ?? "제목 없음";
    const titleJa = decodeAndCompact(item.titleJa ?? fallbackTitle);
    const titleKo = decodeAndCompact(item.titleKo ?? item.translatedTitle ?? item.titleTranslated ?? fallbackTitle);

    return {
      id: cleanPatentNumber(item.id ?? publicationNumber),
      publicationNumber,
      applicationNumber: publicationNumber,
      titleJa,
      titleKo,
      applicant: decodeAndCompact(item.applicant ?? "출원인 정보 없음") || "출원인 정보 없음",
      applicationDate: item.filingDate ?? "",
      publicationDate: "",
      ipcClasses: [],
      country: "JP",
    };
  });

  return {
    items: summaries,
    totalResults: data.totalCount ?? summaries.length,
    page,
    pageSize: size,
    elapsedMs: Date.now() - startedAt,
    source: "patent-api",
  };
}

async function fetchPatentApiDetail(id: string): Promise<PatentDetailResponse> {
  const cleanedId = cleanPatentNumber(id);
  const response = await fetch(`${PATENT_API_BASE_URL}/api/patents/${encodeURIComponent(cleanedId)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`patent-api detail failed: ${response.status}`);
  }

  const data = (await response.json()) as PatentApiDetailResponse;
  const fallbackTitle = data.title ?? "제목 없음";
  const fallbackAbstract = data.abstractText ?? data.abstract ?? "요약 정보 없음";
  const titleJa = decodeAndCompact(data.titleJa ?? fallbackTitle);
  const titleKo = decodeAndCompact(data.titleKo ?? data.translatedTitle ?? data.titleTranslated ?? fallbackTitle);
  const abstractJa = decodeAndCompact(data.abstractJa ?? fallbackAbstract);
  const abstractKo = decodeAndCompact(
    data.abstractKo ?? data.translatedAbstract ?? data.abstractTranslated ?? fallbackAbstract,
  );
  const publicationNumber = cleanPatentNumber(data.publicationNumber ?? data.id ?? id);

  return {
    item: {
      id: cleanPatentNumber(data.id ?? id),
      publicationNumber,
      applicationNumber: publicationNumber,
      titleJa,
      titleKo,
      applicant: decodeAndCompact(data.applicant ?? "출원인 정보 없음") || "출원인 정보 없음",
      applicationDate: data.filingDate ?? "",
      publicationDate: "",
      ipcClasses: [],
      country: "JP",
      inventors: [],
      abstractJa,
      abstractKo,
      jPlatPatUrl: "https://www.j-platpat.inpit.go.jp/",
      espacenetUrl: data.originalUrl ?? "",
    },
    source: "patent-api",
  };
}

export async function searchPatents(input: SearchParams): Promise<SearchResponse> {
  const params = normalizeSearchParams(input);

  try {
    return await fetchPatentApiSearch(params);
  } catch (error) {
    console.warn("[patent-api] search failed", {
      params,
      message: toErrorMessage(error),
    });
    const fallback = await searchMockPatents(params);
    return {
      ...fallback,
      notice: `patent-api 검색에 실패하여 샘플 결과로 대체했습니다. ${toErrorMessage(error)}`.trim(),
    };
  }
}

export async function getPatentDetail(id: string): Promise<PatentDetailResponse> {
  try {
    return await fetchPatentApiDetail(id);
  } catch (error) {
    console.error("[patent-api] detail failed", {
      id,
      message: toErrorMessage(error),
    });
    const fallback = await getMockPatentDetail(id);
    return {
      ...fallback,
      notice: `patent-api 상세 조회에 실패하여 샘플 데이터로 대체했습니다. ${toErrorMessage(error)}`.trim(),
    };
  }
}

export async function translateTextToKorean(text: string) {
  const response = await fetch(`${PATENT_API_BASE_URL}/api/translations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sourceText: text, sourceLang: "ja", targetLang: "ko" }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`patent-api translate failed: ${response.status}`);
  }

  const payload = (await response.json()) as PatentApiTranslateResponse;
  return payload.translatedText ?? payload.text ?? text;
}
