export type SourceKind = "mock" | "serpapi";

export type PatentSummary = {
  id: string;
  publicationNumber: string;
  applicationNumber: string;
  titleJa: string;
  titleKo: string;
  applicant: string;
  applicationDate: string;
  publicationDate: string;
  ipcClasses: string[];
  country: "JP";
};

export type PatentDetail = PatentSummary & {
  inventors: string[];
  abstractJa: string;
  abstractKo: string;
  jPlatPatUrl: string;
  espacenetUrl: string;
};

export type SearchParams = {
  q?: string;
  patentNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  ipc?: string;
  page?: number;
  pageSize?: number;
};

export type SearchResponse = {
  items: PatentSummary[];
  totalResults: number;
  page: number;
  pageSize: number;
  elapsedMs: number;
  source: SourceKind;
  notice?: string;
};

export type PatentDetailResponse = {
  item: PatentDetail;
  source: SourceKind;
  notice?: string;
};
