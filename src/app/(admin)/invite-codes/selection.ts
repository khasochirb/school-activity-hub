// Checkbox selection for bulk invite codes. Pure, so tests load it as is.

export function toggleAll(ids: string[], checked: boolean) {
  return checked ? new Set(ids) : new Set<string>();
}

export function toggleOne(current: Set<string>, id: string, checked: boolean) {
  const next = new Set(current);

  if (checked) next.add(id);
  else next.delete(id);

  return next;
}

// "{count} / {total} сонгосон" with the numbers filled in.
export function selectedCountLabel(template: string, count: number, total: number) {
  return template.replace("{count}", String(count)).replace("{total}", String(total));
}
