'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarketingPlanContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-4 mt-0 text-4xl font-bold tracking-tight text-white">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-4 mt-12 border-b border-white/10 pb-3 text-2xl font-semibold text-white">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-3 mt-8 text-lg font-semibold text-blue-400">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="mb-2 mt-6 text-base font-semibold text-slate-300">{children}</h4>
        ),
        p: ({ children }) => <p className="mb-4 leading-7 text-slate-300">{children}</p>,
        a: ({ href, children }) => (
          <a href={href} className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="mb-4 ml-6 list-disc space-y-1 text-slate-300">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-4 ml-6 list-decimal space-y-1 text-slate-300">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-7">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="mb-4 border-l-4 border-blue-500/50 bg-blue-500/5 py-3 pl-5 pr-4 text-slate-300 italic">
            {children}
          </blockquote>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) {
            return <code className="block">{children}</code>
          }
          return (
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm font-mono text-blue-300">
              {children}
            </code>
          )
        },
        pre: ({ children }) => (
          <pre className="mb-4 overflow-x-auto rounded-xl border border-white/5 bg-slate-900 p-5 text-sm font-mono leading-6 text-slate-300">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="mb-6 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm text-slate-300">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-white/10 bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
            {children}
          </thead>
        ),
        tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-white/[0.02]">{children}</tr>,
        th: ({ children }) => <th className="px-4 py-3 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="px-4 py-3">{children}</td>,
        hr: () => <hr className="my-10 border-white/10" />,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="text-slate-400 italic">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
