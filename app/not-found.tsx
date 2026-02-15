import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-xl border border-brand-dark/20 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-dark">Page not found</h1>
        <p className="mt-3 text-brand-dark/80">
          This route does not exist or the group session is no longer available.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white"
        >
          Go to home
        </Link>
      </section>
    </main>
  );
}
