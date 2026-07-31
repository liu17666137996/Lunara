import type { Metadata } from "next";
import { Fraunces, Noto_Sans_SC } from "next/font/google";
import { Providers } from "@/components/Providers";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className={`${fraunces.variable} ${notoSansSC.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased bg-ink text-paper">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
