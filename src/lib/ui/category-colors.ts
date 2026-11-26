// Category colours from the approved Clean draft. Used for chips, labels,
// covers and calendar dots so a category looks the same everywhere.
const CATEGORY_COLORS: Record<string, string> = {
  Academic: "#2340d9",
  Arts: "#e0447a",
  Career: "#0f8a9a",
  Culture: "#b25e00",
  Leadership: "#f2643f",
  "Mental Health": "#7a5af0",
  Other: "#6d6a63",
  Outdoor: "#2f8f5b",
  Social: "#c08a00",
  Sports: "#12804a",
  Volunteering: "#6b4fd6",
};

export function categoryColor(category: string | null | undefined) {
  return (category && CATEGORY_COLORS[category]) || "#6d6a63";
}
