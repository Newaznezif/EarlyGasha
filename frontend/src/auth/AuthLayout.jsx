import { Globe } from 'lucide-react';

const AuthLayout = ({ title, description, children }) => (
  <div className="min-h-screen bg-main text-default">
    <header className="border-b border-edge bg-element">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#/login" className="flex items-center gap-2.5 text-default no-underline">
          <Globe className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold">EarlyGasha</span>
          <span className="hidden border-l border-edge pl-2 text-sm text-muted sm:inline">Ethiopia</span>
        </a>
        <span className="text-xs text-muted sm:text-sm">Regional monitoring</span>
      </div>
    </header>

    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-12">
      <section className="w-full max-w-md rounded-lg border border-edge bg-element p-5 shadow-sm sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-default">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{description}</p>
        </div>
        {children}
      </section>
    </main>
  </div>
);

export default AuthLayout;