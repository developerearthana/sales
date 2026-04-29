"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error ?? "Invalid credentials");
      }
    } catch {
      setError("Network error — please try again");
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-xl shadow-cyan-500/25">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Sales Automation</h1>
            <p className="mt-1 text-sm text-slate-400">Command Center — Admin Access</p>
          </div>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="space-y-5">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Username</span>
              <input
                type="text"
                autoComplete="username"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder-slate-600 transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Password</span>
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 pr-12 text-sm text-white placeholder-slate-600 transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:text-slate-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Authorised access only
        </p>
      </div>
    </main>
  );
}
