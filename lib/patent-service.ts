import { mockPatentDetails } from "@/lib/mock-data";
import { PatentDetail, PatentDetailResponse, PatentSummary, SearchParams, SearchResponse } from "@/lib/types";
import { cleanPatentNumber, compactText, decodeHtmlEntities, normalizeSearchParams } from "@/lib/utils";

const EPO_TOKEN_URL = "https://ops.epo.org/3.2/auth/accesstoken";
const EPO_SEARCH_URL = "https://ops.epo.org/3.2/rest-services/published-data/search";
const EPO_PUBLICATION_BASE = "https://ops.epo.org/3.2/rest-services/published-data/publication/docdb";
const PAPAGO_URL = "https://openapi.naver.com/v1/papago/n2mt";

const MOCK_LATENCY_MS = 140;

let cachedToken: { value: string; expiresAt: number } | null = null;

function hasEpoCredentials() {
  return Boolean(process.env.EPO_OPS_CONSUMER_KEY && process.env.EPO_OPS_CONSUMER_SECRET);
}

function hasPapagoCredentials() {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

async function getEpoAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const credentials = `${process.env.EPO_OPS_CONSUMER_KEY}:${process.env.EPO_OPS_CONSUMER_SECRET}`;
  const basic = Buffer.from(credentials).toString("base64");
  const response = await fetch(EPO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`EPO token request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new Error("EPO token response did not include access_token");
  }

  const expiresInMs = Math.max((payload.expires_in ?? 1200) - 60, 60) * 1000;
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + expiresInMs,
  };

  return payload.access_token;
}

function parseTagValue(xml: string, tagName: string): string | undefined {
  const pattern = new RegExp(
    `<(?:[\\w-]+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tagName}>`,
    "i",
  );
  const match = xml.match(pattern);
  return match ? compactText(decodeHtmlEntities(match[1].replace(/<[^>]+>/g, " "))) : undefined;
}

function parseTagValues(xml: string, tagName: string): string[] {
  const pattern = new RegExp(
    `<(?:[\\w-]+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tagName}>`,
    "gi",
  );
  return Array.from(xml.matchAll(pattern))
    .map((match) => compactText(decodeHtmlEntities(match[1].replace(/<[^>]+>/g, " "))))
    .filter(Boolean);
}

function parseDocumentBlocks(xml: string): string[] {
  return Array.from(
    xml.matchAll(/<(?:[\w-]+:)?exchange-document\b[\s\S]*?<\/(?:[\w-]+:)?exchange-document>/gi),
  ).map((match) => match[0]);
}

function parseDateFromReference(xml: string, referenceName: "publication-reference" | "application-reference") {
  const section = new RegExp(
    `<(?:[\\w-]+:)?${referenceName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${referenceName}>`,
    "i",
  ).exec(xml)?.[1];

  const raw = section ? parseTagValue(section, "date") : undefined;
  if (!raw) return "";
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
}

function parsePublicationNumber(xml: string): string {
  const attrs =
    /<(?:[\w-]+:)?exchange-document\b[^>]*country="([^"]+)"[^>]*doc-number="([^"]+)"[^>]*kind="([^"]+)"/i.exec(xml) ??
    /<(?:[\w-]+:)?exchange-document\b[^>]*doc-number="([^"]+)"[^>]*country="([^"]+)"[^>]*kind="([^"]+)"/i.exec(xml);

  if (attrs) {
    if (attrs.length === 4) {
      if (/^[A-Z]{2}$/i.test(attrs[1])) {
        return `${attrs[1]}${attrs[2]}${attrs[3]}`;
      }
      return `${attrs[2]}${attrs[1]}${attrs[3]}`;
    }
  }

  const country = parseTagValue(xml, "country") ?? "JP";
  const docNumber = parseTagValue(xml, "doc-number") ?? "";
  const kind = parseTagValue(xml, "kind") ?? "";
  return `${country}${docNumber}${kind}`;
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
  const pageSize = params.pageSize ?? 5;
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
    notice: "EPO OPS 또는 Papago 인증 정보가 없어 샘플 데이터로 응답했습니다.",
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
    notice: "EPO OPS 또는 Papago 인증 정보가 없어 샘플 상세 데이터를 보여주고 있습니다.",
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

function buildOpsQuery(params: SearchParams) {
  const clauses = ["ct=JP"];

  if (params.q) {
    const escaped = params.q.replaceAll('"', "");
    clauses.push(`(ti="${escaped}" or ab="${escaped}" or pa="${escaped}")`);
  }

  if (params.patentNumber) {
    const patentNumber = cleanPatentNumber(params.patentNumber).replace(/^JP/, "");
    clauses.push(`pn=${patentNumber}`);
  }

  if (params.ipc) {
    clauses.push(`ipc=${params.ipc.replace(/\s+/g, "")}`);
  }

  if (params.dateFrom || params.dateTo) {
    const from = (params.dateFrom ?? "1900-01-01").replaceAll("-", "");
    const to = (params.dateTo ?? "2099-12-31").replaceAll("-", "");
    clauses.push(`pd within "${from},${to}"`);
  }

  return clauses.join(" AND ");
}

async function fetchEpoSearch(params: SearchParams): Promise<SearchResponse> {
  const token = await getEpoAccessToken();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 5;
  const start = (page - 1) * pageSize + 1;
  const end = start + pageSize - 1;
  const query = buildOpsQuery(params);
  const startedAt = Date.now();

  const response = await fetch(`${EPO_SEARCH_URL}?q=${encodeURIComponent(query)}&Range=${start}-${end}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/xml",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`EPO search failed: ${response.status}`);
  }

  const xml = await response.text();
  const totalRaw =
    /total-result-count="(\d+)"/i.exec(xml)?.[1] ??
    /<ops:total-result-count>(\d+)<\/ops:total-result-count>/i.exec(xml)?.[1] ??
    String(parseDocumentBlocks(xml).length);
  const documents = parseDocumentBlocks(xml);

  const items = await Promise.all(
    documents.map(async (documentXml) => {
      const titleJa = parseTagValues(documentXml, "invention-title")[0] ?? "제목 없음";
      const titleKo = await translateText(titleJa);
      const applicant =
        parseTagValues(documentXml, "applicant-name")[0] ??
        parseTagValues(documentXml, "name")[0] ??
        "출원인 정보 없음";
      const ipcClasses = parseTagValues(documentXml, "classification-ipcr")
        .map((value) => value.replace(/\s+/g, " ").trim())
        .slice(0, 3);
      const publicationNumber = parsePublicationNumber(documentXml);
      const applicationNumber = parseTagValue(documentXml, "doc-number") ?? publicationNumber;

      return {
        id: publicationNumber,
        publicationNumber,
        applicationNumber,
        titleJa,
        titleKo,
        applicant,
        applicationDate: parseDateFromReference(documentXml, "application-reference"),
        publicationDate: parseDateFromReference(documentXml, "publication-reference"),
        ipcClasses,
        country: "JP" as const,
      };
    }),
  );

  return {
    items,
    totalResults: Number(totalRaw) || items.length,
    page,
    pageSize,
    elapsedMs: Date.now() - startedAt,
    source: "epo",
  };
}

function buildPublicationPath(id: string) {
  const normalized = cleanPatentNumber(id).replace(/^JP/, "");
  const kindMatch = normalized.match(/([A-Z]\d?)$/);
  const kind = kindMatch?.[1] ?? "A";
  const number = normalized.replace(/[A-Z]\d?$/, "");
  return `JP.${number}.${kind}`;
}

async function fetchEpoDetail(id: string): Promise<PatentDetailResponse> {
  const token = await getEpoAccessToken();
  const publicationPath = buildPublicationPath(id);
  const [biblioResponse, abstractResponse] = await Promise.all([
    fetch(`${EPO_PUBLICATION_BASE}/${publicationPath}/biblio`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/xml",
      },
      cache: "no-store",
    }),
    fetch(`${EPO_PUBLICATION_BASE}/${publicationPath}/abstract`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/xml",
      },
      cache: "no-store",
    }),
  ]);

  if (!biblioResponse.ok || !abstractResponse.ok) {
    throw new Error(`EPO detail request failed: ${biblioResponse.status}/${abstractResponse.status}`);
  }

  const [biblioXml, abstractXml] = await Promise.all([biblioResponse.text(), abstractResponse.text()]);

  const titleJa = parseTagValues(biblioXml, "invention-title")[0] ?? "제목 없음";
  const abstractJa =
    parseTagValues(abstractXml, "p").join(" ") || parseTagValue(abstractXml, "abstract") || "요약 정보 없음";

  const [titleKo, abstractKo] = await Promise.all([translateText(titleJa), translateText(abstractJa)]);

  const publicationNumber = parsePublicationNumber(biblioXml) || cleanPatentNumber(id);
  const inventors = parseTagValues(biblioXml, "inventor-name");
  const ipcClasses = parseTagValues(biblioXml, "classification-ipcr").slice(0, 5);

  return {
    item: {
      id: publicationNumber,
      publicationNumber,
      applicationNumber: parseTagValue(biblioXml, "doc-number") ?? publicationNumber,
      titleJa,
      titleKo,
      applicant:
        parseTagValues(biblioXml, "applicant-name")[0] ??
        parseTagValues(biblioXml, "name")[0] ??
        "출원인 정보 없음",
      applicationDate: parseDateFromReference(biblioXml, "application-reference"),
      publicationDate: parseDateFromReference(biblioXml, "publication-reference"),
      ipcClasses,
      country: "JP",
      inventors: inventors.length > 0 ? inventors : ["발명자 정보 없음"],
      abstractJa,
      abstractKo,
      jPlatPatUrl: "https://www.j-platpat.inpit.go.jp/",
      espacenetUrl: `https://worldwide.espacenet.com/patent/search/family/${publicationNumber}`,
    },
    source: "epo",
  };
}

export async function searchPatents(input: SearchParams): Promise<SearchResponse> {
  const params = normalizeSearchParams(input);

  if (!hasEpoCredentials()) {
    return searchMockPatents(params);
  }

  try {
    return await fetchEpoSearch(params);
  } catch (error) {
    const fallback = await searchMockPatents(params);
    return {
      ...fallback,
      notice: `실시간 EPO 검색에 실패하여 샘플 결과로 대체했습니다. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
    };
  }
}

export async function getPatentDetail(id: string): Promise<PatentDetailResponse> {
  if (!hasEpoCredentials()) {
    return getMockPatentDetail(id);
  }

  try {
    return await fetchEpoDetail(id);
  } catch (error) {
    const fallback = await getMockPatentDetail(id);
    return {
      ...fallback,
      notice: `실시간 EPO 상세 조회에 실패하여 샘플 데이터로 대체했습니다. ${
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
