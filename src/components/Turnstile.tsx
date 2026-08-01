"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Script from "next/script";

interface TurnstileRenderOptions {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
}

function getTurnstileApi(): TurnstileApi | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile ?? null;
}

export interface TurnstileHandle {
  reset: () => void;
  /**
   * Token 是一次性的：校验过一次后就不能再用（比如注册成功后紧接着自动登录，
   * 会各自触发一次 siteverify）。这里让挂件重新出一个 token 再返回。
   */
  getFreshToken: () => Promise<string | null>;
}

/** Cloudflare Turnstile 人机验证挂件，通过 explicit render 拿到 token 交给父组件。 */
export const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string) => void; className?: string }>(
  function Turnstile({ onToken, className }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const pendingResolversRef = useRef<((token: string | null) => void)[]>([]);

    const handleToken = useCallback(
      (token: string) => {
        onToken(token);
        const resolvers = pendingResolversRef.current;
        pendingResolversRef.current = [];
        resolvers.forEach((resolve) => resolve(token));
      },
      [onToken],
    );

    useImperativeHandle(
      ref,
      () => ({
        reset() {
          const turnstile = getTurnstileApi();
          if (turnstile && widgetIdRef.current) {
            turnstile.reset(widgetIdRef.current);
          }
        },
        getFreshToken() {
          const turnstile = getTurnstileApi();
          if (!turnstile || !widgetIdRef.current) return Promise.resolve(null);

          return new Promise<string | null>((resolve) => {
            let settled = false;
            const settle = (value: string | null) => {
              if (settled) return;
              settled = true;
              resolve(value);
            };

            pendingResolversRef.current.push(settle);
            setTimeout(() => settle(null), 15_000);
            turnstile.reset(widgetIdRef.current!);
          });
        },
      }),
      [],
    );

    useEffect(() => {
      if (!scriptLoaded || !containerRef.current) return;
      const turnstile = getTurnstileApi();
      if (!turnstile) return;

      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
        theme: "dark",
        callback: handleToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    }, [scriptLoaded, handleToken, onToken]);

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setScriptLoaded(true)}
        />
        <div ref={containerRef} className={className} />
      </>
    );
  },
);
