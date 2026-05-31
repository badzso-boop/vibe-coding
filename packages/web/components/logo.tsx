import Link from 'next/link'

interface LogoProps {
  className?: string
  variant?: 'light' | 'dark'
}

export function Logo({ className = '', variant = 'light' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-slate-900'

  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
        <div className="grid grid-cols-2 gap-0.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-white" />
          <div className="h-2.5 w-2.5 rounded-sm bg-blue-300" />
          <div className="h-2.5 w-2.5 rounded-sm bg-blue-300" />
          <div className="h-2.5 w-2.5 rounded-sm bg-white" />
        </div>
      </div>
      <span className={`text-lg font-semibold tracking-tight ${textColor}`}>FlowSpace</span>
    </Link>
  )
}
