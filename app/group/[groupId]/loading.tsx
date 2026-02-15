function MenuSkeletonCard() {
  return (
    <article className="overflow-hidden rounded-xl border border-brand-dark/20 bg-background shadow-sm">
      <div className="aspect-[16/10] w-full animate-pulse bg-brand-dark/10" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-brand-dark/10" />
        <div className="h-3 w-full animate-pulse rounded bg-brand-dark/10" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-brand-dark/10" />
      </div>
    </article>
  );
}

export default function GroupLoadingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
      <section className="rounded-xl border border-brand-dark/20 bg-background p-6 shadow-sm">
        <div className="h-4 w-28 animate-pulse rounded bg-brand-dark/10" />
        <div className="mt-3 h-7 w-56 animate-pulse rounded bg-brand-dark/10" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="h-4 w-full animate-pulse rounded bg-brand-dark/10" />
          <div className="h-4 w-full animate-pulse rounded bg-brand-dark/10" />
          <div className="h-4 w-full animate-pulse rounded bg-brand-dark/10" />
          <div className="h-4 w-full animate-pulse rounded bg-brand-dark/10" />
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <div className="h-6 w-24 animate-pulse rounded bg-brand-dark/10" />
        <div className="grid gap-4 md:grid-cols-2">
          <MenuSkeletonCard />
          <MenuSkeletonCard />
          <MenuSkeletonCard />
          <MenuSkeletonCard />
        </div>
      </section>
    </main>
  );
}
