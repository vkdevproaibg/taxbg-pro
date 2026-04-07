import type { PropsWithChildren } from 'react'

interface MetricCardProps extends PropsWithChildren {
  title: string
  value: string
}

export default function MetricCard({ title, value, children }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {children}
    </div>
  )
}
