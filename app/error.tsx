"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-xl border border-brand-dark/20 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-dark">Something went off-script</h1>
        <p className="mt-3 text-brand-dark/80">
          We hit an unexpected data error while loading this route.
        </p>
        <p className="mt-2 rounded-md bg-brand-dark/5 p-3 font-mono text-xs text-brand-dark/80">
          {error.message}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
