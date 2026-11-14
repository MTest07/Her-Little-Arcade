import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-950 px-4 text-center text-stone-100">
      <div className="max-w-md rounded-2xl border border-stone-800 bg-stone-900 p-8 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
          404 · Page Not Found
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-100">
          This notebook page could not be found
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-stone-400">
          The arcade room or page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-950 transition-colors hover:bg-amber-400"
          >
            Return to Her Little Arcade
          </Link>
        </div>
      </div>
    </div>
  );
}
