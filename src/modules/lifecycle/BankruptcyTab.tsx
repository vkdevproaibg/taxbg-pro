import {
  BANKRUPTCY_CHECKLIST,
  BANKRUPTCY_RISKS,
} from '../../constants/lifecycle-events'
import ChecklistCard from './ChecklistCard'
import HelpButton from '../../components/ui/HelpButton'

const RISK_META = {
  critical: { color: 'var(--danger)', bg: 'var(--danger-light)', icon: '🔴' },
  high:     { color: '#9a3412',       bg: '#fff7ed',             icon: '🟠' },
  medium:   { color: '#92400e',       bg: '#fffbeb',             icon: '🟡' },
}

export default function BankruptcyTab() {
  return (
    <div className="space-y-6 p-6">

      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Банкротство (Несъстоятелност)
        </h2>
        <HelpButton
          topic="несъстоятелност банкротство синдик окръжен съд директор"
          title="Банкротство"
          pageContext="lifecycle-bankruptcy"
        />
      </div>

      {/* Critical warning */}
      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--danger-light)', border: '2px solid var(--danger)' }}>
        <p className="font-bold text-sm mb-2" style={{ color: 'var(--danger)' }}>
          🚨 КРИТИЧЕСКИ ВАЖНО — прочитайте прежде всего
        </p>
        <div className="space-y-2">
          {[
            'Директор ОБЯЗАН подать заявление о банкротстве НЕМЕДЛЕННО при выявлении неплатёжеспособности',
            'Промедление = личная уголовная ответственность до 5 лет лишения свободы',
            'Личная имущественная ответственность по долгам компании',
            'Незнание закона не освобождает от ответственности',
          ].map((w, i) => (
            <p key={i} className="text-xs font-medium" style={{ color: 'var(--danger-text)' }}>
              · {w}
            </p>
          ))}
        </div>
      </div>

      {/* When bankruptcy applies */}
      <div className="rounded-xl shadow-sm overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Когда применяется процедура банкротства
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {[
            {
              title: 'Неплатёжеспособност',
              desc:  'Компания не может исполнять денежные обязательства более 60 дней. Наиболее распространённое основание.',
              icon: '💸',
            },
            {
              title: 'Свръхзадълженост',
              desc:  'Пассивы превышают активы. Применяется к ООД и АД. Директор обязан подать немедленно.',
              icon: '📊',
            },
            {
              title: 'Отличие от ликвидации',
              desc:  'Ликвидация — добровольное закрытие когда есть деньги. Банкротство — принудительное когда денег нет.',
              icon: '⚖️',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 px-4 py-3"
              style={{ backgroundColor: 'var(--surface-card)' }}>
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Creditor priority */}
      <div className="rounded-xl shadow-sm overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Порядок удовлетворения требований кредиторов
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {[
            { priority: '1', label: 'Залоговые кредиторы',  desc: 'По обеспеченным залогом требованиям',                color: '#7c3aed' },
            { priority: '2', label: 'Расходы по делу',       desc: 'Гонорар синдика, судебные расходы',                  color: '#6d28d9' },
            { priority: '3', label: 'Зарплаты сотрудников',  desc: 'Трудовые вознаграждения за последние 3 года',        color: 'var(--accent)' },
            { priority: '4', label: 'НАП и НОИ',             desc: 'Налоги и осигурителни вноски',                       color: '#dc2626' },
            { priority: '5', label: 'Остальные кредиторы',   desc: 'Поставщики, банки без залога',                       color: 'var(--text-secondary)' },
            { priority: '6', label: 'Собственники',           desc: 'Получают только если что-то осталось',              color: 'var(--text-muted)' },
          ].map((row) => (
            <div key={row.priority} className="flex items-center gap-4 px-4 py-2.5"
              style={{ backgroundColor: 'var(--surface-card)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                style={{ backgroundColor: row.color }}>
                {row.priority}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {row.label}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {row.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risks */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Риски для директора
        </h3>
        <div className="space-y-2">
          {BANKRUPTCY_RISKS.map((risk) => {
            const meta = RISK_META[risk.severity]
            return (
              <div key={risk.title} className="rounded-xl p-4"
                style={{ backgroundColor: meta.bg, border: `1.5px solid ${meta.color}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{meta.icon}</span>
                  <p className="font-semibold text-sm" style={{ color: meta.color }}>
                    {risk.title}
                  </p>
                </div>
                <p className="text-xs" style={{ color: meta.color }}>{risk.description}</p>
                <p className="text-xs mt-1 opacity-70" style={{ color: meta.color }}>
                  {risk.legalBasis}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Emergency action plan */}
      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--danger-light)', border: '1.5px solid var(--danger)' }}>
        <p className="font-semibold text-sm mb-3" style={{ color: 'var(--danger-text)' }}>
          🆘 Если компания сейчас неплатёжеспособна — действуйте немедленно
        </p>
        <div className="space-y-2">
          {[
            { step: '1', text: 'Позвоните адвокату по банкротству сегодня' },
            { step: '2', text: 'Не выводите активы — это преступление' },
            { step: '3', text: 'Не предпочитайте одних кредиторов другим' },
            { step: '4', text: 'Подайте заявление в Окръжен съд немедленно' },
            { step: '5', text: 'Уведомите сотрудников о ситуации' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--danger)', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                {item.step}
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--danger-text)' }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Professional help — mandatory */}
      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          ⚖️ Самостоятельно — невозможно
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Процедура несъстоятелност — одна из самых сложных в болгарском праве.
          Без опытного адвоката по банкротству директор рискует уголовным преследованием
          и личной имущественной ответственностью.
          Найдите адвоката специализирующегося на Търговски закон.
        </p>
      </div>

      {/* Checklist */}
      <ChecklistCard
        items={BANKRUPTCY_CHECKLIST}
        title={`Процедура несъстоятелност (${BANKRUPTCY_CHECKLIST.length} шагов)`}
      />
    </div>
  )
}
