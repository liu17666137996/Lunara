"use client";

import { authClient } from "@/lib/auth-client";

export function GoogleSignInButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-dim"
      }
    >
      使用 Google 登录
    </button>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              window.location.href = "/";
            },
          },
        })
      }
      className={
        className ??
        "text-sm text-mist transition-colors hover:text-paper"
      }
    >
      退出登录
    </button>
  );
}
