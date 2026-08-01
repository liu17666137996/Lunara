"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
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
}

/** Cloudflare Turnstile 人机验证挂件，通过 explicit render 拿到 token 交给父组件。 */
export const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string) => void; className?: string }>(
  function Turnstile({ onToken, className }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useImperativeHandle(ref, () => ({
      reset() {
        const turnstile = getTurnstileApi();
        if (turnstile && widgetIdRef.current) {
          turnstile.reset(widgetIdRef.current);
        }
      },
    }));

    useEffect(() => {
      if (!scriptLoaded || !containerRef.current) return;
      const turnstile = getTurnstileApi();
      if (!turnstile) return;

      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
        theme: "dark",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    }, [scriptLoaded, onToken]);

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
