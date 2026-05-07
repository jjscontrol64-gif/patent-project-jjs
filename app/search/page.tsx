import { SearchResultsClient } from "@/components/search-results-client";
import { searchPatents } from "@/lib/patent-service";
import { normalizeSearchParams } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const normalized = normalizeSearchParams(await searchParams);
  const response = await searchPatents(normalized);

  return <SearchResultsClient response={response} searchParams={normalized} />;
}
