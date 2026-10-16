import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders assistant text. Links open in a new tab; no raw HTML is allowed. */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: (p) => <p className="mb-3 last:mb-0" {...p} />,
        ul: (p) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0" {...p} />,
        ol: (p) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0" {...p} />,
        a: ({ node: _n, ...p }) => <a className="text-accent underline underline-offset-2" target="_blank" rel="noreferrer noopener" {...p} />,
        strong: (p) => <strong className="font-semibold" {...p} />,
        h1: (p) => <h3 className="mb-2 font-semibold" {...p} />,
        h2: (p) => <h3 className="mb-2 font-semibold" {...p} />,
        h3: (p) => <h3 className="mb-2 font-semibold" {...p} />,
        code: (p) => <code className="rounded bg-surface2 px-1.5 py-0.5 text-[0.85em]" {...p} />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
