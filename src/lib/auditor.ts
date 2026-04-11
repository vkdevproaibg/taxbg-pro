import { buildAuditReport } from './riskEngine'
import { TAX_RATES_2026 } from '../constants/tax-rates-2026'
import type { LegalForm } from '../store/userStore'
import type { Transaction } from '../store/accountingStore'
import type { Employee } from '../store/employeesStore'

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2).replace(/\.?0+$/, '')}%`
}

export function buildAuditorSystemPrompt(options: {
  legalForm: LegalForm
  companyName: string
  taxPeriod: string
  hasVat: boolean
  hasEmployees: boolean
  transactions: Transaction[]
  employees: Employee[]
  eik: string
}): string {
  const report = buildAuditReport(options)
  const r = TAX_RATES_2026

  const riskSummary = report.risks
    .slice(0, 8)
    .map((risk) => `[${risk.level.toUpperCase()}] ${risk.title}: ${risk.description}`)
    .join('\n')

  return `Ты - TaxBG Аудитор, опытный болгарский налоговый адвокат и бухгалтер.
Специализация: налогообложение IT компаний и фрилансеров в Болгарии.
Аудитория: русско- и украиноязычные IT предприниматели-релоканты.

ДАННЫЕ КЛИЕНТА:
- Компания: ${options.companyName || 'не указана'}
- Правна форма: ${options.legalForm.toUpperCase()}
- ЕИК: ${options.eik || 'не указан'}
- ДДС регистрация: ${options.hasVat ? 'да' : 'нет'}
- Есть служители: ${options.hasEmployees ? 'да' : 'нет'}
- Период: ${options.taxPeriod}

СТАВКИ 2026 (EUR):
- КНП (корпоративен данък): ${formatPercent(r.corporateTax.value)}
- ДДФЛ: ${formatPercent(r.personalIncomeTax.value)}
- Данък дивиденти: ${formatPercent(r.dividendTax.value)}
- ДДС стандартен: ${formatPercent(r.vat.value)}
- МРЗ: ${r.minWage.value} €
- Макс. осигурителен доход: ${r.maxOsig.value} €

ТЕКУЩИЙ АУДИТ - ВЫЯВЛЕННЫЕ РИСКИ (${report.totalCount}):
Индекс здоровья: ${report.healthScore}/100
Критических: ${report.criticalCount} | Высоких: ${report.highCount}

${riskSummary || 'Рисков не обнаружено.'}

ИНСТРУКЦИИ:
1. Отвечай как опытный болгарский адвокат - конкретно, с ссылками на законы
2. Для каждого риска: объясни последствия, дай конкретные действия, назови сроки
3. Упоминай штрафы только с точными суммами из болгарского законодательства
4. Если пользователь спрашивает о теме не связанной с болгарским правом - вежливо верни разговор к налоговым вопросам
5. При неопределенности - рекомендуй консультацию с лицензированным счетоводителем
6. Всегда отвечай на языке пользователя`
}

export function buildAuditorReport(options: {
  legalForm: LegalForm
  companyName?: string
  taxPeriod: string
  hasVat?: boolean
  hasEmployees?: boolean
  transactions?: Transaction[]
  employees?: Employee[]
  eik?: string
}): string {
  return buildAuditorSystemPrompt({
    legalForm: options.legalForm,
    companyName: options.companyName ?? '',
    taxPeriod: options.taxPeriod,
    hasVat: options.hasVat ?? false,
    hasEmployees: options.hasEmployees ?? false,
    transactions: options.transactions ?? [],
    employees: options.employees ?? [],
    eik: options.eik ?? '',
  })
}
