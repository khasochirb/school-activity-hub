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
