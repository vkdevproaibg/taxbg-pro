import { TAX_RATES_2026 } from '../constants/tax-rates-2026'
import type { Employee } from '../store/employeesStore'

export interface Obrazec1Row {
  employee: Employee
  osigBase: number
  dooEr: number
  upfEr: number
  zoEr: number
  ozmEr: number
  tzpbEr: number
  bezrEr: number
  totalEr: number
  dooEe: number
  upfEe: number
  zoEe: number
  ozmEe: number
  bezrEe: number
  totalEe: number
  incomeTax: number
  netSalary: number
  totalCost: number
}

export interface Obrazec1Summary {
  period: string
  companyName: string
  eik: string
  rows: Obrazec1Row[]
  totalEmployerContrib: number
  totalEmployeeContrib: number
  totalIncomeTax: number
  totalNetPaid: number
  totalCost: number
}

export function calculateObrazec1(
  employees: Employee[],
  period: string,
  companyName: string,
  eik: string
): Obrazec1Summary {
  const r = TAX_RATES_2026
  const active = employees.filter(e => e.active)

  const rows: Obrazec1Row[] = active.map(emp => {
    const gross = emp.grossSalary
    const osigBase = Math.min(gross, r.maxOsig.value)

    const dooEr = osigBase * r.employer.doo.value
    const upfEr = osigBase * r.employer.upf.value
    const zoEr = osigBase * r.employer.zo.value
    const ozmEr = osigBase * r.employer.ozm.value
    const tzpbEr = osigBase * r.employer.tzpb.value
    const bezrEr = osigBase * r.employer.bezr.value
    const totalEr = dooEr + upfEr + zoEr + ozmEr + tzpbEr + bezrEr

    const dooEe = osigBase * r.employee.doo.value
    const upfEe = osigBase * r.employee.upf.value
    const zoEe = osigBase * r.employee.zo.value
    const ozmEe = osigBase * r.employee.ozm.value
    const bezrEe = osigBase * r.employee.bezr.value
    const totalEe = dooEe + upfEe + zoEe + ozmEe + bezrEe

    const taxBase = Math.max(gross - totalEe, 0)
    const incomeTax = taxBase * r.personalIncomeTax.value
    const netSalary = gross - totalEe - incomeTax
    const totalCost = gross + totalEr

    return {
      employee: emp, osigBase,
      dooEr, upfEr, zoEr, ozmEr, tzpbEr, bezrEr, totalEr,
      dooEe, upfEe, zoEe, ozmEe, bezrEe, totalEe,
      incomeTax, netSalary, totalCost,
    }
  })

  return {
    period, companyName, eik, rows,
    totalEmployerContrib: rows.reduce((s, r) => s + r.totalEr, 0),
    totalEmployeeContrib: rows.reduce((s, r) => s + r.totalEe, 0),
    totalIncomeTax: rows.reduce((s, r) => s + r.incomeTax, 0),
    totalNetPaid: rows.reduce((s, r) => s + r.netSalary, 0),
    totalCost: rows.reduce((s, r) => s + r.totalCost, 0),
  }
}

export function obrazec1ToCsv(summary: Obrazec1Summary): string {
  const headers = [
    'ЕГН', 'Имя', 'Должность', 'Брутто €', 'База осиг.',
    'ДОО работодател', 'УПФ работодател', 'ЗО работодател',
    'ДОО работник', 'УПФ работник', 'ЗО работник',
    'ДДФЛ', 'Нетто €', 'Разход работодател'
  ]

  const rows = summary.rows.map(r => [
    r.employee.egn,
    r.employee.name,
    r.employee.position,
    r.employee.grossSalary.toFixed(2),
    r.osigBase.toFixed(2),
    r.dooEr.toFixed(2), r.upfEr.toFixed(2), r.zoEr.toFixed(2),
    r.dooEe.toFixed(2), r.upfEe.toFixed(2), r.zoEe.toFixed(2),
    r.incomeTax.toFixed(2),
    r.netSalary.toFixed(2),
    r.totalCost.toFixed(2),
  ])

  const q = (v: string) => `"${v.replace(/"/g, '""')}"`

  return [
    `# Образец 1 · ${summary.period} · ${summary.companyName} · ЕИК ${summary.eik}`,
    headers.map(q).join(';'),
    ...rows.map(r => r.map(q).join(';')),
    '',
    `# Итого`,
    `# Осигуровки работодател: ${summary.totalEmployerContrib.toFixed(2)} €`,
    `# Осигуровки работник: ${summary.totalEmployeeContrib.toFixed(2)} €`,
    `# ДДФЛ удержан: ${summary.totalIncomeTax.toFixed(2)} €`,
    `# Общий расход: ${summary.totalCost.toFixed(2)} €`,
  ].join('\n')
}
