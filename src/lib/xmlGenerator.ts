import type { DDSFormData, ZKPOFormData } from '../modules/reports/types'
import { DDS_SCHEMA, ZKPO_SCHEMA } from '../constants/nap-schemas'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toFixed(2)
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function downloadXml(xml: string, filename: string) {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── DDS XML ──────────────────────────────────────────────────────────────────
// Structure follows NAP e-services upload format for monthly VAT declaration.
// Verify against official XSD at https://nap.bg/page?id=392 before production use.

export function generateDDSXml(data: DDSFormData): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Declaration
  xmlns="http://www.nap.bg/declaration/dds/2026"
  schemaVersion="${DDS_SCHEMA.version}"
  createdAt="${new Date().toISOString()}">

  <Declarant>
    <CompanyName>${esc(data.companyName)}</CompanyName>
    <EIK>${esc(data.eik)}</EIK>
    <VATNumber>${esc(data.vatNumber)}</VATNumber>
  </Declarant>

  <TaxPeriod>${esc(data.period)}</TaxPeriod>
  <Currency>EUR</Currency>

  <!-- Раздел А: Продажби -->
  <Sales>
    <Row rate="20">
      <TaxBase>${fmt(data.salesBase20)}</TaxBase>
      <VATAmount>${fmt(data.vatOut20)}</VATAmount>
    </Row>
    <Row rate="9">
      <TaxBase>${fmt(data.salesBase9)}</TaxBase>
      <VATAmount>${fmt(data.vatOut9)}</VATAmount>
    </Row>
    <Row rate="0">
      <TaxBase>${fmt(data.salesBase0)}</TaxBase>
      <VATAmount>0.00</VATAmount>
    </Row>
  </Sales>

  <!-- Раздел Б: Покупки -->
  <Purchases>
    <Row rate="20">
      <TaxBase>${fmt(data.purchasesBase20)}</TaxBase>
      <VATDeductible>${fmt(data.vatIn20)}</VATDeductible>
    </Row>
    <Row rate="9">
      <TaxBase>${fmt(data.purchasesBase9)}</TaxBase>
      <VATDeductible>${fmt(data.vatIn9)}</VATDeductible>
    </Row>
  </Purchases>

  <!-- Резултат -->
  <Result>
    <VATPayable>${fmt(data.vatPayable)}</VATPayable>
    <VATRefund>${fmt(data.vatRefund)}</VATRefund>
  </Result>

</Declaration>`
}

// ─── ZKPO XML ─────────────────────────────────────────────────────────────────
// Structure follows NAP e-services upload format for annual corporate tax declaration.
// Verify against official XSD at https://nap.bg/page?id=393 before production use.

export function generateZKPOXml(data: ZKPOFormData): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Declaration
  xmlns="http://www.nap.bg/declaration/zkpo/2026"
  schemaVersion="${ZKPO_SCHEMA.version}"
  createdAt="${new Date().toISOString()}">

  <Declarant>
    <CompanyName>${esc(data.companyName)}</CompanyName>
    <EIK>${esc(data.eik)}</EIK>
  </Declarant>

  <TaxYear>${data.year}</TaxYear>
  <Currency>EUR</Currency>

  <!-- Финансов резултат -->
  <FinancialResult>
    <TotalRevenue>${fmt(data.totalRevenue)}</TotalRevenue>
    <TotalExpenses>${fmt(data.totalExpenses)}</TotalExpenses>
    <AccountingProfit>${fmt(data.accountingProfit)}</AccountingProfit>
  </FinancialResult>

  <!-- Данъчни корекции -->
  <TaxAdjustments>
    <NonDeductibleExpenses>${fmt(data.nonDeductibleExpenses)}</NonDeductibleExpenses>
    <TaxableProfit>${fmt(data.taxableProfit)}</TaxableProfit>
  </TaxAdjustments>

  <!-- Данък -->
  <Tax>
    <CorporateTaxRate>0.10</CorporateTaxRate>
    <CorporateTax>${fmt(data.corporateTax)}</CorporateTax>
    <AdvancePaid>${fmt(data.advancePaid)}</AdvancePaid>
    <TaxDue>${fmt(data.taxDue)}</TaxDue>
  </Tax>

</Declaration>`
}