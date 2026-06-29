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

export function getPageParam(value: SearchParamValue) {
  const page = Number.parseInt(getSearchParam(value), 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function pageRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;

  return {
    from,
    to: from + pageSize,
  };
}

export function pageRows<T>(rows: T[] | null | undefined, pageSize: number) {
  const values = rows ?? [];

  return {
    hasNextPage: values.length > pageSize,
    rows: values.slice(0, pageSize),
  };
}

export function postgrestSearchPattern(value: string) {
  const safeValue = value.replace(/[%,()]/g, " ").trim();

  return safeValue ? `%${safeValue}%` : "";
}
