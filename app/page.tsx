import Image from "next/image";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 bg-black text-zinc-100 overflow-hidden">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      >
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/4 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_60%)] blur-3xl" />
      </div>

      <div className="hero relative z-10 max-w-xl text-center space-y-4">
        {/* Logo */}
        <div className="mx-auto mb-4 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900/70 backdrop-blur-sm shadow-[0_0_60px_rgba(255,255,255,0.28)]">
            <Image
              src="/savvy-gorilla-logo-white.png" // <-- update this path if your logo file is named differently
              alt="Savvy Gorilla Technologies"
              width={64}
              height={64}
              className="h-12 w-12 object-contain"
              priority
            />
          </div>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Savvy Rilla FX API
        </h1>

        <p className="text-sm text-zinc-300 sm:text-base">
          Real-time FX infrastructure for SSP and key global currencies. Powered
          by{" "}
          <span className="font-medium">
            Savvy Gorilla Technologies™
          </span>
          .
        </p>

        <p className="mt-4 text-xs text-zinc-500 sm:text-sm">
          Endpoint docs and charts coming soon. For now, use{" "}
          <code className="rounded bg-zinc-900 px-1.5 py-1 text-[0.7rem]">
            /api/health
          </code>{" "}
          to verify the service.
        </p>

        {/* Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/api/health"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-100 px-4 py-2 text-xs font-medium text-black transition hover:bg-white hover:border-zinc-500"
          >
            Check API health
          </a>

          <a
            href="#"
            aria-disabled="true"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700/70 bg-zinc-900/50 px-4 py-2 text-xs font-medium text-zinc-400 transition hover:border-zinc-500/80 hover:text-zinc-200 cursor-not-allowed"
          >
            Docs (coming soon)
          </a>
        </div>

        {/* Tiny footer */}
        <p className="mt-6 text-[0.65rem] text-zinc-600">
          © {new Date().getFullYear()} Savvy Gorilla Technologies™. All rights
          reserved.
        </p>
      </div>

      {/* Local fade-in animation for the hero */}
      <style jsx>{`
        .hero {
          opacity: 0;
          transform: translateY(10px);
          animation: fadeInUp 700ms ease-out forwards;
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
