// "3 students from your class": tap to see who. Names come from the
// classmates helpers, which only return students who share their name.
export function ClassmatesFromClass({
  label,
  names,
}: {
  label: string;
  names: string[];
}) {
  if (!names.length) return null;

  return (
    <details className="classmates">
      <summary>
        <span aria-hidden="true" className="classmates-faces">
          {names.slice(0, 3).map((name, index) => (
            <i key={`${name}-${index}`}>{Array.from(name.replace(/^.\.\s*/, ""))[0]?.toUpperCase() ?? "?"}</i>
          ))}
        </span>
        {label}
      </summary>
      <ul>
        {names.map((name, index) => (
          <li key={`${name}-${index}`}>{name}</li>
        ))}
      </ul>
    </details>
  );
}
