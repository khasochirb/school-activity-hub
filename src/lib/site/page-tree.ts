export type SitePage = {
  body: string;
  id: string;
  parent_id: string | null;
  position: number;
  slug: string;
  status: string;
  title: string;
};

export type SitePageNode = SitePage & { children: SitePage[] };

// Two levels, like a site menu: top-level pages, each with its sub-pages.
// A page whose parent is missing from the list (unpublished or deleted) moves
// to the top level instead of disappearing.
export function buildPageTree(pages: SitePage[]): SitePageNode[] {
  const ids = new Set(pages.map((page) => page.id));
  const byPosition = (a: SitePage, b: SitePage) =>
    a.position - b.position || a.title.localeCompare(b.title);
  const top = pages.filter((page) => !page.parent_id || !ids.has(page.parent_id));
  const topIds = new Set(top.map((page) => page.id));

  return top.sort(byPosition).map((page) => ({
    ...page,
    children: pages
      .filter((child) => child.parent_id === page.id && !topIds.has(child.id))
      .sort(byPosition),
  }));
}

// Page text is plain text. Blank lines separate paragraphs; nothing is parsed
// as HTML or Markdown, so a page cannot inject markup.
export function bodyParagraphs(body: string): string[] {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
