export default function EventsPage() {
  return <PlaceholderPage title="Events" />;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-950">{title}</h1>
      <p className="mt-2 text-sm text-zinc-600">
        This section will be built in a later phase.
      </p>
    </section>
  );
}
