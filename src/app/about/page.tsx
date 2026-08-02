import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我们 · Lunara",
};

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16 sm:px-10">
      <p className="text-xs uppercase tracking-[0.3em] text-mist">About</p>
      <h1 className="mt-3 font-display text-4xl text-paper sm:text-5xl">关于我们</h1>
      <p className="mt-6 max-w-xl text-sm leading-relaxed text-paper-dim">
        Lunara 想做的是一个让人感到被理解、被陪伴的对话空间。这个页面的详细介绍还在准备中，敬请期待。
      </p>
    </div>
  );
}
