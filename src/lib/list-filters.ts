export type SearchParamValue = string | string[] | undefined;

export function getSearchParam(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

export function matchesSearch(query: string, values: Array<string | null | undefined>) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => normalize(value).includes(normalizedQuery));
}

export function normalize(value: string | null | undefined) {
  return (value ?? "").toLocaleLowerCase().trim();
}
