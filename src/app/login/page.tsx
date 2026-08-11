"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { GoogleSignInButton } from "@/components/AuthButtons";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle | null>(null);

  function resetCaptcha() {
    setTurnstileToken("");
    turnstileRef.current?.reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!turnstileToken) {
      setError("请先完成人机验证。");
      return;
    }

    setPending(true);
    try {
      const fetchOptions = { headers: { "x-captcha-response": turnstileToken } };

      const { error: authError } =
        mode === "register"
          ? await authClient.signUp.email({
              name: email.split("@")[0],
              email,
              password,
              fetchOptions,
            })
          : await authClient.signIn.email({ email, password, fetchOptions });

      if (authError) {
        if (authError.code === "VERIFICATION_FAILED" || authError.code === "MISSING_RESPONSE") {
          setError("人机验证未通过，请重试。");
        } else if (mode === "register") {
          setError(authError.message ?? "注册失败，请稍后重试。");
        } else {
          setError("邮箱或密码不正确。");
        }
        resetCaptcha();
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <div className="flex gap-6 border-b border-line">
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
          <span className="text-xs text-mist">邮箱</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

        <Turnstile ref={turnstileRef} onToken={setTurnstileToken} className="mt-1" />

        {error && <p className="text-sm text-rose">{error}</p>}

        <button
          type="submit"
          disabled={pending || !turnstileToken}
          className="mt-2 rounded-full bg-ember px-5 py-2.5 text-sm font-medium text-ink transition-opacity disabled:opacity-40"
        >
          {pending ? "处理中…" : mode === "login" ? "登录" : "注册并登录"}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs text-mist">或</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <GoogleSignInButton className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-paper px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-dim" />
    </div>
  );
}
