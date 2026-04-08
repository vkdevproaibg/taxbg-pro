import { useHelpStore } from '../../store/helpStore'

interface Props {
  topic: string
  title?: string
  pageContext?: string
  size?: 'sm' | 'md'
}

export default function HelpButton({ topic, title, pageContext, size = 'sm' }: Props) {
  const openHelp = useHelpStore((s) => s.openHelp)

  return (
    <button
      onClick={() => openHelp({ topic, title, pageContext })}
      className={`
        inline-flex items-center justify-center rounded-full
        bg-slate-100 text-slate-500 font-medium
        hover:bg-violet-100 hover:text-violet-600 transition-colors
        ${size === 'sm' ? 'w-4 h-4 text-xs' : 'w-5 h-5 text-sm'}
      `}
      title={`Справка: ${topic}`}
    >
      ?
    </button>
  )
}
