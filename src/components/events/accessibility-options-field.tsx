"use client";

import { useState } from "react";

export type AccessibilityOption = {
  id: string;
  label: string;
};

type AccessibilitySelection = {
  customEnabled: boolean;
  customText: string;
  selectedIds: string[];
};

export function AccessibilityOptionsField({
  customLabel,
  description,
  error,
  initialValue,
  label,
  maxLength,
  name,
  notSpecifiedLabel,
  onValueChange,
  options,
  placeholder,
}: {
  customLabel: string;
  description?: string;
  error?: string;
  initialValue: string;
  label: string;
  maxLength: number;
  name: string;
  notSpecifiedLabel?: string;
  onValueChange?: (value: string) => void;
  options: AccessibilityOption[];
  placeholder: string;
}) {
  const [selection, setSelection] = useState<AccessibilitySelection>(() =>
    parseAccessibilitySelection(initialValue, options),
  );
  const combinedValue = combineAccessibilitySelection(selection, options);
  const selectedLabels = options
    .filter((option) => selection.selectedIds.includes(option.id))
    .map((option) => option.label);
  const presetLength = selectedLabels.join("\n").length;
  const customMaxLength = Math.max(
    0,
    maxLength - presetLength - (selectedLabels.length ? 1 : 0),
  );

  function updateSelection(next: AccessibilitySelection) {
    const normalized = {
      ...next,
      selectedIds: Array.from(new Set(next.selectedIds)),
    };
    setSelection(normalized);
    onValueChange?.(combineAccessibilitySelection(normalized, options));
  }

  function togglePreset(optionId: string, checked: boolean) {
    updateSelection({
      ...selection,
      selectedIds: checked
        ? [...selection.selectedIds, optionId]
        : selection.selectedIds.filter((id) => id !== optionId),
    });
  }

  function clearSelection() {
    updateSelection({ customEnabled: false, customText: "", selectedIds: [] });
  }

  return (
    <fieldset className="form-group min-w-0">
      <legend className="form-group-title">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {notSpecifiedLabel ? (
          <CheckboxChip
            checked={!selection.customEnabled && selection.selectedIds.length === 0}
            label={notSpecifiedLabel}
            onChange={(checked) => {
              if (checked) clearSelection();
            }}
          />
        ) : null}
        {options.map((option) => (
          <CheckboxChip
            checked={selection.selectedIds.includes(option.id)}
            key={option.id}
            label={option.label}
            onChange={(checked) => togglePreset(option.id, checked)}
          />
        ))}
        <CheckboxChip
          checked={selection.customEnabled}
          label={customLabel}
          onChange={(checked) =>
            updateSelection({ ...selection, customEnabled: checked })
          }
        />
      </div>
      {selection.customEnabled ? (
        <textarea
          className="mt-3 min-h-20 w-full rounded-md border px-3 py-2 text-base outline-none transition"
          maxLength={customMaxLength}
          onChange={(event) =>
            updateSelection({ ...selection, customText: event.target.value })
          }
          placeholder={placeholder}
          value={selection.customText}
        />
      ) : null}
      <input name={name} type="hidden" value={combinedValue} />
      {error ? (
        <span className="mt-2 block break-words text-xs font-medium text-red-700" role="alert">
          {error}
        </span>
      ) : null}
      {description ? (
        <p className="mt-2 break-words text-xs leading-5 text-slate-600">
          {description}
        </p>
      ) : null}
    </fieldset>
  );
}

function CheckboxChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`inline-flex min-h-10 min-w-0 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold leading-snug transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--primary)] ${
        checked
          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-slate-950"
          : "border-[var(--border)] bg-[var(--card)] text-slate-700 hover:border-[var(--primary)]"
      }`}
    >
      <input
        checked={checked}
        className="h-4 w-4 shrink-0 accent-[var(--primary)]"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="min-w-0 whitespace-normal break-words">{label}</span>
    </label>
  );
}

function parseAccessibilitySelection(
  value: string,
  options: AccessibilityOption[],
): AccessibilitySelection {
  const optionByLabel = new Map(
    options.map((option) => [normalizeComparison(option.label), option.id]),
  );
  const selectedIds: string[] = [];
  const customLines: string[] = [];

  for (const line of value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const optionId = optionByLabel.get(normalizeComparison(line));
    if (optionId) selectedIds.push(optionId);
    else customLines.push(line);
  }

  return {
    customEnabled: customLines.length > 0,
    customText: customLines.join("\n"),
    selectedIds: Array.from(new Set(selectedIds)),
  };
}

function combineAccessibilitySelection(
  selection: AccessibilitySelection,
  options: AccessibilityOption[],
) {
  const values: string[] = [];
  const seen = new Set<string>();

  for (const option of options.filter((item) =>
    selection.selectedIds.includes(item.id),
  )) {
    const label = option.label.trim();
    const normalized = normalizeComparison(label);
    if (label && !seen.has(normalized)) {
      values.push(label);
      seen.add(normalized);
    }
  }

  if (selection.customEnabled) {
    for (const line of selection.customText
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)) {
      const normalized = normalizeComparison(line);
      if (!seen.has(normalized)) {
        values.push(line);
        seen.add(normalized);
      }
    }
  }

  return values.join("\n");
}

function normalizeComparison(value: string) {
  return value.trim().toLocaleLowerCase();
}
