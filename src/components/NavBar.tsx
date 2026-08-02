"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/AuthButtons";

const BASE_LINKS = [{ href: "/chat", label: "聊天" }];

export function NavBar({ isLoggedIn, userName }: { isLoggedIn: boolean; userName: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = isLoggedIn ? [...BASE_LINKS, { href: "/billing", label: "会员" }] : BASE_LINKS;
  const showAuthCta = !isLoggedIn && pathname !== "/login";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-10">
        <Link href="/" className="font-display text-lg tracking-wide text-paper" onClick={() => setOpen(false)}>
          Lunara
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname === link.href ? "text-paper" : "text-mist hover:text-paper-dim"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 sm:flex">
          {isLoggedIn ? (
            <>
              <span className="text-sm text-mist">{userName}</span>
              <SignOutButton />
            </>
          ) : (
            showAuthCta && (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper-dim"
              >
                登录 / 注册
              </Link>
            )
          )}
        </div>

        <button
          type="button"
          aria-label={open ? "关闭菜单" : "打开菜单"}
          onClick={() => setOpen((v) => !v)}
          className="text-xl leading-none text-paper-dim sm:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-3 py-2 text-sm ${
                pathname === link.href ? "bg-ink-2 text-paper" : "text-mist"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {(isLoggedIn || showAuthCta) && (
            <div className="mt-2 flex items-center justify-between border-t border-line px-3 pt-3">
              {isLoggedIn ? (
                <>
                  <span className="text-sm text-mist">{userName}</span>
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2 text-sm font-medium text-ink"
                >
                  登录 / 注册
                </Link>
              )}
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
