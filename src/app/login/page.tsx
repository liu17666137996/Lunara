"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "注册失败，请稍后重试。");
          return;
        }
      }

      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("用户名或密码不正确。");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12">
      <span className="font-display text-xl tracking-wide text-paper">Lunara</span>

      <div className="mt-8 flex gap-6 border-b border-line">
        {(
          [
            ["login", "登录"],
            ["register", "注册"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
              mode === value
                ? "border-ember text-paper"
                : "border-transparent text-mist hover:text-paper-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-mist">用户名</span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={30}
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-2xl border border-line bg-ink-2 px-4 py-2.5 text-sm text-paper placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-mist">密码</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl border border-line bg-ink-2 px-4 py-2.5 text-sm text-paper placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
          />
        </label>

        {error && <p className="text-sm text-rose">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-ember px-5 py-2.5 text-sm font-medium text-ink transition-opacity disabled:opacity-40"
        >
          {pending ? "处理中…" : mode === "login" ? "登录" : "注册并登录"}
        </button>
      </form>
    </div>
  );
}
