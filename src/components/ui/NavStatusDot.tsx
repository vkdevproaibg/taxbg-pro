import type { NavStatus } from '../../lib/navStatus'

const COLOR: Record<NavStatus, string | null> = {
  green:  '#10b981',
  yellow: '#f59e0b',
  red:    '#ef4444',
  none:   null,
}

interface Props {
  status: NavStatus
  size?: number
}

export default function NavStatusDot({ status, size = 7 }: Props) {
  const color = COLOR[status]
  if (!color) return null

  return (
    <span
      className={status === 'red' ? 'nav-dot-pulse' : undefined}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  )
}
