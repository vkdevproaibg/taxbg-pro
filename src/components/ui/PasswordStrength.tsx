import type { AppLanguage } from '../../store/userStore'

export function getPasswordStrength(pwd: string): 0 | 1 | 2 | 3 {
  if (pwd.length === 0) return 0
  if (pwd.length < 8) return 1
  const hasLetters = /[a-zA-Zа-яА-Я]/.test(pwd)
  const hasDigits  = /\d/.test(pwd)
  const hasSpecial = /[^a-zA-Zа-яА-Я0-9]/.test(pwd)
  if (hasLetters && hasDigits && hasSpecial) return 3
  if (hasLetters && hasDigits) return 2
  return 1
}

const LABELS: Record<AppLanguage, [string, string, string]> = {
  ru: ['Слабый', 'Средний', 'Сильный'],
  uk: ['Слабкий', 'Середній', 'Сильний'],
  en: ['Weak', 'Medium', 'Strong'],
  bg: ['Слаба', 'Средна', 'Силна'],
}
const COLORS = ['#ef4444', '#f59e0b', '#22c55e']

interface Props {
  password: string
  lang: AppLanguage
}

export default function PasswordStrength({ password, lang }: Props) {
  const strength = getPasswordStrength(password)
  if (strength === 0) return null

  const idx   = strength - 1
  const label = LABELS[lang][idx]
  const color = COLORS[idx]

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: i <= strength ? color : 'var(--border)' }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color }}>
        {label}
      </p>
    </div>
  )
}
