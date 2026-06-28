import Link from "next/link";

type BadgeVariant =
  | "danger"
  | "default"
  | "info"
  | "success"
  | "warning";

export function PageHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: React.ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="page-header">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        {actions ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="empty-state">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        {description}
      </p>
      {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function HeaderActionLink({
  children,
  href,
  variant = "primary",
}: {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      className={`btn ${variant === "primary" ? "btn-primary" : "btn-secondary"} w-full sm:w-auto`}
      href={href}
    >
      {children}
    </Link>
  );
}

export function DetailsDisclosure({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <details className="details-panel">
      <summary className="details-summary">{label}</summary>
      <div className="details-content">{children}</div>
    </details>
  );
}

export function FilterPanel({
  action,
  children,
  clearHref,
  clearLabel,
  resultCountLabel,
  submitLabel,
}: {
  action: string;
  children: React.ReactNode;
  clearHref: string;
  clearLabel: string;
  resultCountLabel: string;
  submitLabel: string;
}) {
  return (
    <section className="section-card section-card-padded">
      <form
        action={action}
        className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto]"
      >
        {children}
        <button className="btn btn-primary min-h-11 md:self-end" type="submit">
          {submitLabel}
        </button>
        <Link
          className="btn btn-secondary min-h-11 md:self-end"
          href={clearHref}
        >
          {clearLabel}
        </Link>
      </form>
      <p className="mt-3 text-sm font-medium text-slate-600">
        {resultCountLabel}
      </p>
    </section>
  );
}

export function SearchField({
  defaultValue,
  label,
  name = "q",
  placeholder,
}: {
  defaultValue?: string;
  label: string;
  name?: string;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
      {label}
      <input
        className="h-11 rounded-md border px-3 text-base font-normal outline-none transition"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        type="search"
      />
    </label>
  );
}

export function SelectFilter({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
      {label}
      <select
        className="h-11 cursor-pointer rounded-md border px-3 text-base font-normal outline-none transition"
        defaultValue={defaultValue ?? ""}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NoResultsState({
  clearHref,
  clearLabel,
  description,
  title,
}: {
  clearHref: string;
  clearLabel: string;
  description: string;
  title: string;
}) {
  return (
    <EmptyState
      action={
        <HeaderActionLink href={clearHref} variant="secondary">
          {clearLabel}
        </HeaderActionLink>
      }
      description={description}
      title={title}
    />
  );
}

export function StatusBadge({
  children,
  status,
  variant,
}: {
  children?: React.ReactNode;
  status?: string;
  variant?: BadgeVariant;
}) {
  return (
    <span className={`badge ${badgeVariantClass(variant ?? variantForStatus(status))}`}>
      {children ?? formatBadgeText(status ?? "status")}
    </span>
  );
}

export function CategoryBadge({ children }: { children: React.ReactNode }) {
  return <span className="badge category-badge">{children}</span>;
}

function variantForStatus(status: string | undefined): BadgeVariant {
  if (!status) {
    return "default";
  }

  if (
    status === "active" ||
    status === "approved" ||
    status === "attended" ||
    status === "received" ||
    status === "registered"
  ) {
    return "success";
  }

  if (
    status === "pending" ||
    status === "pending_approval" ||
    status === "pending_review"
  ) {
    return "warning";
  }

  if (
    status === "archived" ||
    status === "canceled" ||
    status === "declined" ||
    status === "expired" ||
    status === "inactive" ||
    status === "rejected" ||
    status === "revoked"
  ) {
    return "danger";
  }

  return "default";
}

function badgeVariantClass(variant: BadgeVariant) {
  if (variant === "success") {
    return "badge-success";
  }

  if (variant === "warning") {
    return "badge-warning";
  }

  if (variant === "danger") {
    return "badge-danger";
  }

  if (variant === "info") {
    return "badge-info";
  }

  return "";
}

function formatBadgeText(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
