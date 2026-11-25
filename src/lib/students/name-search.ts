// Matching a typed search against student names, the way staff actually
// type: Cyrillic or Latin, any case ("khuslen", "Хүслэн", "huslen" all find
// Хүслэн), several words narrowing ("хүслэн 10ё"). Mirrors the database's
// mn_search_fold. No imports, so the tests can run it directly.

const MULTI: Array<[string, string]> = [
  ["ё", "yo"], ["ж", "j"], ["ц", "ts"], ["ч", "ch"], ["ш", "sh"], ["щ", "sh"], ["ю", "yu"], ["я", "ya"], ["х", "h"],
];
const SINGLE_FROM = "абвгдезийклмноөпрстуүфыэьъ";
const SINGLE_TO = "abvgdeziiklmnooprstuufyei";

export function foldForSearch(value: string) {
  let text = value.toLowerCase();

  for (const [from, to] of MULTI) text = text.split(from).join(to);
  text = Array.from(text, (char) => {
    const index = SINGLE_FROM.indexOf(char);
    return index === -1 ? char : (SINGLE_TO[index] ?? "");
  }).join("");

  return text.replace(/kh/g, "h").replace(/zh/g, "j").replace(/ö/g, "o").replace(/ü/g, "u");
}

export function matchesStudent(
  query: string,
  student: { first_name: string; homeroom?: string | null; last_name: string; student_number?: string | null },
) {
  const words = foldForSearch(query.trim()).split(/\s+/).filter(Boolean);

  if (!words.length) return false;

  const fields = [student.first_name, student.last_name, student.student_number ?? ""].map(foldForSearch);
  const classGroup = foldForSearch(student.homeroom ?? "");

  return words.every((word) => fields.some((field) => field.includes(word)) || classGroup.startsWith(word));
}
