import Link from "next/link";
import { ActionToast } from "@/components/toast-provider";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { formatDate } from "@/lib/i18n/date-format";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import {
  getPageParam,
  getSearchParam,
  pageRange,
  pageRows,
  postgrestSearchPattern,
} from "@/lib/list-filters";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EmptyState,
  FilterPanel,
  HeaderActionLink,
  NoResultsState,
  PaginationControls,
  PageHeader,
  SearchField,
  SelectFilter,
  StatusBadge,
} from "../../_components/page-ui";

type School = {
  created_at: string;
  id: string;
  name: string;
  province: string | null;
  slug: string;
  status: "active" | "archived";
};

type SchoolsSearchParams = {
  error?: string | string[];
  page?: string | string[];
  q?: string | string[];
  status?: string | string[];
  success?: string | string[];
};

const SCHOOLS_PAGE_SIZE = 50;

export default async function SuperAdminSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<SchoolsSearchParams>;
}) {
  await requirePlatformAdmin();

  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const params = await searchParams;
  const successMessage = getSearchValue(params.success);
  const errorMessage = getSearchValue(params.error);
  const searchQuery = getSearchParam(params.q);
  const selectedStatus = parseSchoolStatus(getSearchParam(params.status));
  const page = getPageParam(params.page);
  const range = pageRange(page, SCHOOLS_PAGE_SIZE);
  const admin = createAdminClient();
  let schoolsQuery = admin
    .from("schools")
    .select("id, name, slug, province, status, created_at")
    .order("created_at", { ascending: false });

  if (selectedStatus) {
    schoolsQuery = schoolsQuery.eq("status", selectedStatus);
  }

  const searchPattern = postgrestSearchPattern(searchQuery);

  if (searchPattern) {
    schoolsQuery = schoolsQuery.or(
      [
        `name.ilike.${searchPattern}`,
        `slug.ilike.${searchPattern}`,
        `province.ilike.${searchPattern}`,
      ].join(","),
    );
  }

  const { data: schools, error } = await schoolsQuery
    .range(range.from, range.to)
    .returns<School[]>();

  const { hasNextPage, rows: schoolRows } = pageRows(
    schools,
    SCHOOLS_PAGE_SIZE,
  );
  const hasFilters = Boolean(searchQuery || selectedStatus);

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <>
            <HeaderActionLink href="/super-admin/schools/new">
              {t("superAdmin.newSchool.actions.createSchool")}
            </HeaderActionLink>
            <HeaderActionLink href="/super-admin" variant="secondary">
              {t("superAdmin.actions.backToPlatformDashboard")}
            </HeaderActionLink>
          </>
        }
        description={t("superAdmin.schools.description")}
        eyebrow={t("nav.superAdmin")}
        title={t("superAdmin.schools.title")}
      />
      <ActionToast message={successMessage} success />
      <ActionToast message={errorMessage} success={false} />

      {successMessage ? (
        <p className="notice-box notice-success text-sm" role="status">
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="notice-box notice-danger text-sm" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <FilterPanel
        action="/super-admin/schools"
        clearHref="/super-admin/schools"
        clearLabel={t("filters.clear")}
        resultCountLabel={tf("filters.showingResults", {
          count: schoolRows.length,
        })}
        submitLabel={t("filters.filter")}
      >
        <SearchField
          defaultValue={searchQuery}
          label={t("filters.search")}
          placeholder={t("filters.searchSchools")}
        />
        <SelectFilter
          defaultValue={selectedStatus}
          label={t("filters.status")}
          name="status"
          options={[
            { label: t("filters.all"), value: "" },
            { label: t("status.active"), value: "active" },
            { label: t("status.archived"), value: "archived" },
          ]}
        />
      </FilterPanel>

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">{t("superAdmin.schools.allSchools")}</h2>
          {error ? (
            <p className="mt-2 text-sm text-red-600">
              {t("common.somethingWentWrong")}
            </p>
          ) : null}
        </div>

        {!error && schoolRows.length === 0 ? (
          <div className="p-4">
            {hasFilters ? (
              <NoResultsState
                clearHref="/super-admin/schools"
                clearLabel={t("filters.clear")}
                description={t("filters.noResultsDescription")}
                title={t("filters.noResults")}
              />
            ) : (
              <EmptyState
                description={t("superAdmin.schools.emptyDescription")}
                title={t("superAdmin.schools.emptyTitle")}
              />
            )}
          </div>
        ) : null}

        {schoolRows.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.schools.fields.name")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.schools.fields.province")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.schools.fields.status")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.schools.fields.schoolIdentifier")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.schools.fields.created")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("superAdmin.schoolDetail.fields.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {schoolRows.map((school) => (
                    <tr key={school.id}>
                      <td className="px-4 py-3 font-medium text-zinc-950">
                        {school.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {school.province ?? t("common.notAvailableShort")}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={school.status}>
                          {schoolStatusLabel(school.status, t)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {school.slug}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {formatDate(school.created_at, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          className="btn btn-secondary h-10 w-full sm:w-auto"
                          href={`/super-admin/schools/${school.id}`}
                          prefetch={false}
                        >
                          {t("superAdmin.schoolDetail.actions.manageSchool")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-200 md:hidden">
              {schoolRows.map((school) => (
                <article className="p-4" key={school.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-zinc-950">
                        {school.name}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {school.province ?? t("common.notAvailableShort")}
                      </p>
                    </div>
                    <StatusBadge status={school.status}>
                      {schoolStatusLabel(school.status, t)}
                    </StatusBadge>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <DetailItem
                      label={t("superAdmin.schools.fields.schoolIdentifier")}
                      value={school.slug}
                    />
                    <DetailItem
                      label={t("superAdmin.schools.fields.created")}
                      value={formatDate(school.created_at, locale)}
                    />
                  </dl>
                  <Link
                    className="btn btn-secondary mt-4 h-10 w-full"
                    href={`/super-admin/schools/${school.id}`}
                    prefetch={false}
                  >
                    {t("superAdmin.schoolDetail.actions.manageSchool")}
                  </Link>
                </article>
              ))}
            </div>
          </>
        ) : null}
        {!error && (schoolRows.length > 0 || page > 1) ? (
          <PaginationControls
            getHref={(nextPage) =>
              schoolsPageHref(nextPage, searchQuery, selectedStatus)
            }
            hasNextPage={hasNextPage}
            labels={{
              next: t("common.next"),
              page: tf("common.pageNumber", { number: page }),
              previous: t("common.previous"),
            }}
            page={page}
          />
        ) : null}
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-zinc-900">{value}</dd>
    </div>
  );
}

function schoolStatusLabel(
  status: School["status"],
  t: (key: string) => string,
) {
  if (status === "active") {
    return t("status.active");
  }

  return t("status.archived");
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseSchoolStatus(value: string) {
  return value === "active" || value === "archived" ? value : "";
}

function schoolsPageHref(
  page: number,
  searchQuery: string,
  selectedStatus: string,
) {
  const params = new URLSearchParams();

  if (searchQuery) {
    params.set("q", searchQuery);
  }

  if (selectedStatus) {
    params.set("status", selectedStatus);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/super-admin/schools?${query}` : "/super-admin/schools";
}
