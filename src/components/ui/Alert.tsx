import type { PropsWithChildren } from 'react'

interface AlertProps extends PropsWithChildren {
  variant?: 'info' | 'warning' | 'error'
}

export default function Alert({ variant = 'info', children }: AlertProps) {
  const styles =
    variant === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : variant === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-blue-200 bg-blue-50 text-blue-800'

  return <div className={`rounded-lg border p-3 text-sm ${styles}`}>{children}</div>
}
