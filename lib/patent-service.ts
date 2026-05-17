import { mockPatentDetails } from "@/lib/mock-data";
import { PatentDetail, PatentDetailResponse, PatentSummary, SearchParams, SearchResponse } from "@/lib/types";
import { cleanPatentNumber, compactText, decodeHtmlEntities, normalizeSearchParams } from "@/lib/utils";

const PATENT_API_BASE_URL = process.env.PATENT_API_BASE_URL ?? "http://localhost:8080";
const DEEPL_FREE_TRANSLATE_URL = "https://api-free.deepl.com/v2/translate";
const DEEPL_PRO_TRANSLATE_URL = "https://api.deepl.com/v2/translate";

const MOCK_LATENCY_MS = 140;
const DEFAULT_PAGE_SIZE = 10;

type PatentApiItem = {
  id?: string;
  title?: string;
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
  abstractText?: string;
  applicant?: string;
  filingDate?: string;
  publicationNumber?: string;
  originalUrl?: string;
};

type DeepLTranslateResponse = {
  translations?: Array<{
    detected_source_language?: string;
    text?: string;
  }>;
  message?: string;
};

type DeepLTranslateOptions = {
  sourceLang?: "JA" | "KO";
  targetLang?: "JA" | "KO";
};

function hasDeepLCredentials() {
  return Boolean(process.env.DEEPL_API_KEY);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getDeepLTranslateUrl() {
  if (process.env.DEEPL_API_URL?.trim()) {
    return process.env.DEEPL_API_URL.trim();
  }

  return process.env.DEEPL_API_KEY?.endsWith(":fx") ? DEEPL_FREE_TRANSLATE_URL : DEEPL_PRO_TRANSLATE_URL;
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

async function translateText(text: string): Promise<string> {
  const [translatedText] = await translateTexts([text]);
  return translatedText;
}

async function translateTexts(texts: string[], options: DeepLTranslateOptions = {}): Promise<string[]> {
  if (texts.length === 0) return [];
  if (!hasDeepLCredentials()) return texts;

  const sourceLang = options.sourceLang ?? "JA";
  const targetLang = options.targetLang ?? "KO";

  const indexedTexts = texts
    .map((text, index) => ({ text, index }))
    .filter((item) => Boolean(item.text));

  if (indexedTexts.length === 0) {
    return texts;
  }

  const response = await fetch(getDeepLTranslateUrl(), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY as string}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: indexedTexts.map((item) => item.text),
      source_lang: sourceLang,
      target_lang: targetLang,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `DeepL translation failed: ${response.status}`;

    try {
      const errorPayload = (await response.json()) as { message?: string; detail?: string };
      if (errorPayload.message || errorPayload.detail) {
        message = `DeepL translation failed: ${errorPayload.message ?? errorPayload.detail}`;
      }
    } catch {
      // Ignore non-JSON error payloads and keep the status-based message.
    }

    throw new Error(message);
  }

  const payload = (await response.json()) as DeepLTranslateResponse;
  const translatedTexts = payload.translations?.map((item) => item.text ?? "") ?? [];
  const results = [...texts];

  indexedTexts.forEach((item, index) => {
    results[item.index] = translatedTexts[index] ?? item.text;
  });

  return results;
}

async function translateTextSafely(text: string): Promise<string> {
  try {
    return await translateText(text);
  } catch (error) {
    console.warn("[DeepL] translation failed", {
      length: text.length,
      message: toErrorMessage(error),
    });
    return text;
  }
}

async function translateTextsSafely(texts: string[]): Promise<{ texts: string[]; notice?: string }> {
  try {
    return { texts: await translateTexts(texts) };
  } catch (error) {
    const message = toErrorMessage(error);

    console.warn("[DeepL] translation failed", {
      count: texts.length,
      message,
    });

    return {
      texts,
      notice: `DeepL 번역에 실패해 원문으로 표시합니다. ${message}`.trim(),
    };
  }
}

function containsHangul(value: string): boolean {
  return /[가-힣]/.test(value);
}

async function fetchPatentApiSearch(params: SearchParams): Promise<SearchResponse> {
  const page = params.page ?? 1;
  const size = Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE);
  const startedAt = Date.now();
  const notices: string[] = [];

  let keyword = params.q?.trim() ?? "";

  if (keyword && containsHangul(keyword)) {
    if (!hasDeepLCredentials()) {
      notices.push("DeepL API 키가 없어 한국어 검색어를 일본어로 변환하지 못해 원문으로 검색했습니다.");
    } else {
      try {
        const [translatedKeyword] = await translateTexts([keyword], { sourceLang: "KO", targetLang: "JA" });
        if (translatedKeyword.trim()) {
          keyword = translatedKeyword.trim();
          notices.push("한국어 검색어를 일본어로 변환해 검색했습니다.");
        }
      } catch (error) {
        notices.push(`한국어 검색어 번역에 실패해 원문으로 검색했습니다. ${toErrorMessage(error)}`.trim());
      }
    }
  }

  const queryParts = [
    keyword,
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
  const titles = rawItems.map((item) => item.title ?? "");
  const { texts: translatedTitles, notice: translationNotice } = await translateTextsSafely(titles);

  const summaries: PatentSummary[] = rawItems.map((item, i) => {
    const publicationNumber = cleanPatentNumber(item.publicationNumber ?? item.id ?? "");
    return {
      id: cleanPatentNumber(item.id ?? ""),
      publicationNumber,
      applicationNumber: publicationNumber,
      titleJa: compactText(decodeHtmlEntities(item.title ?? "제목 없음")),
      titleKo: compactText(decodeHtmlEntities(translatedTitles[i] ?? item.title ?? "제목 없음")),
      applicant: compactText(decodeHtmlEntities(item.applicant ?? "출원인 정보 없음")) || "출원인 정보 없음",
      applicationDate: item.filingDate ?? "",
      publicationDate: "",
      ipcClasses: [],
      country: "JP",
    };
  });

  if (translationNotice) notices.push(translationNotice);
  if (!hasDeepLCredentials()) notices.push("DeepL API 키가 없어 번역은 원문 기준으로 표시합니다.");

  return {
    items: summaries,
    totalResults: data.totalCount ?? summaries.length,
    page,
    pageSize: size,
    elapsedMs: Date.now() - startedAt,
    source: "patent-api",
    notice: notices.length > 0 ? notices.join(" ") : undefined,
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
  const titleJa = compactText(decodeHtmlEntities(data.title ?? "제목 없음"));
  const abstractJa = compactText(decodeHtmlEntities(data.abstractText ?? "요약 정보 없음"));
  const translation = await translateTextsSafely([titleJa, abstractJa]);
  const [titleKo, abstractKo] = translation.texts;
  const publicationNumber = cleanPatentNumber(data.publicationNumber ?? data.id ?? id);

  const notices: string[] = [];
  if (!hasDeepLCredentials()) notices.push("DeepL API 키가 없어 번역은 원문 기준으로 표시합니다.");
  if (translation.notice) notices.push(translation.notice);

  return {
    item: {
      id: cleanPatentNumber(data.id ?? id),
      publicationNumber,
      applicationNumber: publicationNumber,
      titleJa,
      titleKo,
      applicant: compactText(decodeHtmlEntities(data.applicant ?? "출원인 정보 없음")) || "출원인 정보 없음",
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
    notice: notices.length > 0 ? notices.join(" ") : undefined,
  };
}

export async function searchPatents(input: SearchParams): Promise<SearchResponse> {
  const params = normalizeSearchParams(input);

  try {
    return await fetchPatentApiSearch(params);
  } catch (error) {
    console.warn("[patent-api] search failed", {
      params,
      message: error instanceof Error ? error.message : String(error),
    });
    const fallback = await searchMockPatents(params);
    return {
      ...fallback,
      notice: `patent-api 검색에 실패하여 샘플 결과로 대체했습니다. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
    };
  }
}

export async function getPatentDetail(id: string): Promise<PatentDetailResponse> {
  try {
    return await fetchPatentApiDetail(id);
  } catch (error) {
    console.error("[patent-api] detail failed", {
      id,
      message: error instanceof Error ? error.message : String(error),
    });
    const fallback = await getMockPatentDetail(id);
    return {
      ...fallback,
      notice: `patent-api 상세 조회에 실패하여 샘플 데이터로 대체했습니다. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
    };
  }
}

export async function translateTextToKorean(text: string) {
  return translateTextSafely(text);
}
