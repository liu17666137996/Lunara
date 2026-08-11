import type { Metadata } from "next";
import Script from "next/script";
import { Fraunces, Noto_Sans_SC } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { getSession } from "@/lib/auth";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Lunara · 专属的她",
  description: "一个只属于你的虚拟女友聊天陪伴空间。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="zh" className={`${fraunces.variable} ${notoSansSC.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased bg-ink text-paper">
        <Script id="clarity-script" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "xvzrxqcpko");`}
        </Script>
        <Script
          src="https://plausible.io/js/pa-wxN98naWwvOPOUjqWgXOH.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
          plausible.init()`}
        </Script>
        <NavBar isLoggedIn={!!session?.user} userName={session?.user?.name ?? null} />
        {children}
      </body>
    </html>
  );
}
