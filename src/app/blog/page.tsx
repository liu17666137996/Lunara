import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "博客 · Lunara",
};

export default function BlogPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16 sm:px-10">
      <p className="text-xs uppercase tracking-[0.3em] text-mist">Blog</p>
      <h1 className="mt-3 font-display text-4xl text-paper sm:text-5xl">博客</h1>
      <p className="mt-6 max-w-xl text-sm leading-relaxed text-paper-dim">
        我们会在这里分享 Lunara 的产品更新和一些关于 AI 陪伴的思考。内容正在筹备中，敬请期待。
      </p>
    </div>
  );
}
