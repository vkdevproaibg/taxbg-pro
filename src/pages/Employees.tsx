import { useState } from 'react'
import { format } from 'date-fns'
import { useEmployeesStore } from '../store/employeesStore'
import { useUserStore } from '../store/userStore'
import { useCompaniesStore } from '../store/companiesStore'
import { calculateObrazec1, obrazec1ToCsv } from '../lib/obrazec1'
import type { Employee } from '../store/employeesStore'
import HelpButton from '../components/ui/HelpButton'
import { useT } from '../lib/useT'
import { usePaywall } from '../hooks/usePaywall'
import PaywallModal from '../components/ui/PaywallModal'

function EmployeeCard({ emp, onToggle, onRemove }: {
  emp: Employee
  onToggle: () => void
  onRemove: () => void
}) {
  const t = useT()
  return (
    <div className={`rounded-xl border p-4 ${emp.active ? 'border-slate-100 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-medium text-slate-800">{emp.name}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {emp.position} · ЕГН: {emp.egn} · от {emp.startDate}
          </div>
          <div className="mt-1 text-sm font-medium text-violet-600">{emp.grossSalary.toFixed(2)} € брутто/мес</div>
        </div>
        <div className="shrink-0 flex gap-2">
          <button
            onClick={onToggle}
            className={`rounded-lg px-3 py-1 text-xs ${emp.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}
          >
            {emp.active ? t('employees_active') : t('employees_inactive')}
          </button>
          <button onClick={onRemove} className="text-lg leading-none text-slate-300 hover:text-red-400">×</button>
        </div>
      </div>
    </div>
  )
}

function AddEmployeeForm({ onAdd }: { onAdd: (e: Omit<Employee, 'id'>) => void }) {
  const t = useT()
  const { checkAccess } = usePaywall()
  const [name, setName] = useState('')
  const [egn, setEgn] = useState('')
  const [position, setPosition] = useState('')
  const [gross, setGross] = useState('')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [open, setOpen] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)

  const handleAdd = () => {
    if (!name || !egn || !gross) return
    onAdd({ name, egn, position, grossSalary: Number(gross), startDate, active: true })
    setName('')
    setEgn('')
    setPosition('')
    setGross('')
    setOpen(false)
  }

  if (!open) {
    return (
      <>
        <button
          onClick={() => {
            if (!checkAccess('add_employee')) { setShowPaywall(true); return }
            setOpen(true)
          }}
          className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-sm text-slate-500 transition-colors hover:border-violet-400 hover:text-violet-600"
        >
          {t('employees_add')}
        </button>
        {showPaywall && (
          <PaywallModal reason="add_employee" onClose={() => setShowPaywall(false)} />
        )}
      </>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-5">
      <h3 className="font-medium text-violet-800">Новый сотрудник</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs text-slate-500">Имя и фамилия</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Иван Иванов"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">ЕГН</label>
          <input
            value={egn}
            onChange={e => setEgn(e.target.value)}
            placeholder="8001010000"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Должность</label>
          <input
            value={position}
            onChange={e => setPosition(e.target.value)}
            placeholder="Разработчик"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <label className="mb-1 block text-xs text-slate-500">Брутто зарплата (€/мес)</label>
            <HelpButton
              topic="КСО чл. 7 осигуровки трудов договор работодател работник"
              title="Осигуровки по трудовому договору"
              pageContext="employees"
            />
          </div>
          <input
            type="number"
            value={gross}
            onChange={e => setGross(e.target.value)}
            placeholder="2000"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Дата найма</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleAdd}
          disabled={!name || !egn || !gross}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
        >
          Добавить
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-200 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Отмена
        </button>
      </div>
    </div>
  )
}

export default function Employees() {
  const t = useT()
  const { employees, addEmployee, updateEmployee, removeEmployee } = useEmployeesStore()
  const { companyName, eik } = useUserStore()
  const activeCompanyId = useCompaniesStore((s) => s.activeCompanyId)
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'))
  const [generated, setGenerated] = useState(false)

  const active = employees.filter(e => e.active)
  const summary = calculateObrazec1(active, period, companyName, eik)

  const handleDownload = () => {
    const csv = obrazec1ToCsv(summary)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `obrazec1_${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setGenerated(true)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('page_employees')}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {t('employees_subtitle')}
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <strong>Образец 1</strong> подаётся в НАП ежемесячно до 25-го числа за предыдущий месяц.
        Содержит данные о всех сотрудниках: осигуровки, ДДФЛ, нетто зарплата.
        Подаётся онлайн через <a href="https://inetdec.nra.bg" target="_blank" rel="noreferrer" className="font-medium underline">inetdec.nra.bg</a> с КЕП.
      </div>

      <div className="space-y-3">
        {employees.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            {t('employees_no_employees')}
          </div>
        ) : (
          employees.map(emp => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              onToggle={() => updateEmployee(emp.id, { active: !emp.active })}
              onRemove={() => removeEmployee(emp.id)}
            />
          ))
        )}
        <AddEmployeeForm
          onAdd={(e) => addEmployee({ ...e, companyId: activeCompanyId ?? undefined })}
        />
      </div>

      {active.length > 0 && (
        <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700">Генерация Образец 1</h2>
          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Месяц</label>
              <input
                type="month"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              />
            </div>
            <button
              onClick={handleDownload}
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Скачать CSV
            </button>
            {generated && <span className="text-sm text-green-600">✓ Готово</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="pb-2 text-left font-medium">Сотрудник</th>
                  <th className="pb-2 text-right font-medium">Брутто</th>
                  <th className="pb-2 text-right font-medium">Осиг. работод.</th>
                  <th className="pb-2 text-right font-medium">Осиг. работник</th>
                  <th className="pb-2 text-right font-medium">ДДФЛ</th>
                  <th className="pb-2 text-right font-medium">Нетто</th>
                  <th className="pb-2 text-right font-medium">Разход</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summary.rows.map(row => (
                  <tr key={row.employee.id}>
                    <td className="py-2 text-slate-700">{row.employee.name}</td>
                    <td className="py-2 text-right text-slate-600">{row.employee.grossSalary.toFixed(2)} €</td>
                    <td className="py-2 text-right text-red-500">{row.totalEr.toFixed(2)} €</td>
                    <td className="py-2 text-right text-orange-500">{row.totalEe.toFixed(2)} €</td>
                    <td className="py-2 text-right text-orange-400">{row.incomeTax.toFixed(2)} €</td>
                    <td className="py-2 text-right font-medium text-green-600">{row.netSalary.toFixed(2)} €</td>
                    <td className="py-2 text-right font-medium text-red-600">{row.totalCost.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-medium">
                  <td className="pt-2 text-slate-700">Итого ({active.length} чел.)</td>
                  <td className="pt-2 text-right">{active.reduce((s, r) => s + r.grossSalary, 0).toFixed(2)} €</td>
                  <td className="pt-2 text-right text-red-500">{summary.totalEmployerContrib.toFixed(2)} €</td>
                  <td className="pt-2 text-right text-orange-500">{summary.totalEmployeeContrib.toFixed(2)} €</td>
                  <td className="pt-2 text-right text-orange-400">{summary.totalIncomeTax.toFixed(2)} €</td>
                  <td className="pt-2 text-right text-green-600">{summary.totalNetPaid.toFixed(2)} €</td>
                  <td className="pt-2 text-right text-red-600">{summary.totalCost.toFixed(2)} €</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
