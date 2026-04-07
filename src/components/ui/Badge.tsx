import type { PropsWithChildren } from 'react'

export default function Badge({ children }: PropsWithChildren) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  )
}
