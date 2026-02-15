import Link from "next/link";

type FullPageProps = {
  searchParams?: {
    group?: string | string[];
  };
};

function readParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value) && value.length > 0) {
    const first = value[0]?.trim();
    return first ? first : null;
  }

  return null;
}

export default function FullPage({ searchParams }: FullPageProps) {
  const groupId = readParam(searchParams?.group);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-xl border border-brand-dark/20 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
          Hawks Group Order
        </p>
        <h1 className="mt-2 text-3xl font-bold text-brand-dark">Locker Room is Full</h1>
        <p className="mt-3 text-brand-dark/80">
          This group already has the maximum of 3 participants. Ask the host to create a new group
          if you still want to join.
        </p>
        {groupId ? (
          <p className="mt-2 text-xs text-brand-dark/60">
            Group: <span className="font-mono">{groupId}</span>
          </p>
        ) : null}

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white"
          >
            Start a new group
          </Link>
        </div>
      </section>
    </main>
  );
}
