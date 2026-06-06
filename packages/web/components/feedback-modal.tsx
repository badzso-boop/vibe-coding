'use client'

import { useState, type ReactNode, type FormEvent } from 'react'
import { X, MessageSquare, Check, Loader2, Bug, Lightbulb, HelpCircle } from 'lucide-react'

type FeedbackType = 'bug' | 'feature' | 'other'

interface Props {
  trigger: ReactNode
  userEmail?: string
}

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: React.ElementType }[] = [
  { value: 'bug', label: 'Bug report', icon: Bug },
  { value: 'feature', label: 'Feature request', icon: Lightbulb },
  { value: 'other', label: 'Other', icon: HelpCircle },
]

export function FeedbackModal({ trigger, userEmail }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function open() {
    setIsOpen(true)
    setIsSuccess(false)
    setError(null)
    setTitle('')
    setDescription('')
    setEmail('')
    setType('bug')
  }

  function close() {
    if (isSubmitting) return
    setIsOpen(false)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          description,
          email: userEmail ?? (email || undefined),
        }),
      })

      if (!res.ok) throw new Error()
      setIsSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = !isSubmitting && title.length >= 5 && description.length >= 10

  return (
    <>
      <span onClick={open} style={{ display: 'contents' }}>
        {trigger}
      </span>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <MessageSquare size={18} className="text-blue-600" />
                <h2 className="text-base font-semibold text-slate-900">Send feedback</h2>
              </div>
              <button
                onClick={close}
                disabled={isSubmitting}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {isSuccess ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <Check size={24} className="text-green-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">Thanks!</h3>
                <p className="text-sm text-slate-500">
                  We got your feedback and will look into it.
                </p>
                <button
                  onClick={close}
                  className="mt-6 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6">
                {/* Type selector */}
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setType(value)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                          type === value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    required
                    placeholder="Short summary of your feedback"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{title.length}/100</p>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    required
                    rows={4}
                    placeholder={
                      type === 'bug'
                        ? 'What happened? What did you expect? Steps to reproduce…'
                        : type === 'feature'
                          ? 'Describe the feature you would like to see…'
                          : 'Tell us more…'
                    }
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">
                    {description.length}/2000
                  </p>
                </div>

                {/* Email — only for unauthenticated users */}
                {!userEmail && (
                  <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Email <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                )}

                {/* Error */}
                {error && (
                  <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
                    {error}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    disabled={isSubmitting}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Sending…
                      </>
                    ) : (
                      'Send feedback'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
