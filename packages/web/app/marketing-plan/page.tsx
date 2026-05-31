import { readFile } from 'fs/promises'
import { join } from 'path'
import type { Metadata } from 'next'
import { MarketingPlanContent } from './marketing-plan-content'

export const metadata: Metadata = {
  title: 'Marketing Plan',
  robots: { index: false, follow: false },
}

export default async function MarketingPlanPage() {
  const filePath = join(process.cwd(), 'public', 'marketing-plan.md')
  const content = await readFile(filePath, 'utf-8')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-sm font-bold text-white">F</span>
          </div>
          <span className="text-sm font-medium text-slate-400">FlowSpace</span>
          <span className="text-slate-600">/</span>
          <span className="text-sm text-slate-500">Marketing Plan</span>
        </div>

        <MarketingPlanContent content={content} />
      </div>
    </div>
  )
}
