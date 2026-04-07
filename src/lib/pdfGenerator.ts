import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { DDSFormData, ZKPOFormData } from '../modules/reports/types'

function dl(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }))
  const a   = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

async function base() {
  const doc  = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  return { doc, page, font, bold }
}

function t(page: ReturnType<PDFDocument['addPage']>, text: string, x: number, y: number, font: Awaited<ReturnType<PDFDocument['embedFont']>>, size = 10, color = rgb(0.1, 0.1, 0.1)) {
  page.drawText(String(text), { x, y, size, font, color })
}

function ln(page: ReturnType<PDFDocument['addPage']>, y: number) {
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
}

export async function generateDDSPdf(data: DDSFormData & { vatPayable?: number; vatRefund?: number }) {
  const { doc, page, font, bold } = await base()
  const vatPayable = data.vatPayable ?? Math.max((data.vatOut20 + data.vatOut9) - (data.vatIn20 + data.vatIn9), 0)
  const vatRefund  = data.vatRefund  ?? Math.max(-((data.vatOut20 + data.vatOut9) - (data.vatIn20 + data.vatIn9)), 0)
  let y = 800

  t(page, '[ЧЕРНОВА — не е официален бланк на НАП]', 40, y, font, 8, rgb(0.6, 0.3, 0))
  y -= 18; t(page, 'СПРАВКА-ДЕКЛАРАЦИЯ ПО ЗДДС', 40, y, bold, 14)
  y -= 16; t(page, `Период: ${data.period}   Валута: EUR`, 40, y, font)
  y -= 24; ln(page, y)

  y -= 14; t(page, `Фирма: ${data.companyName}`, 40, y, font)
  y -= 14; t(page, `ЕИК: ${data.eik}   ДДС №: ${data.vatNumber}`, 40, y, font)
  y -= 20; ln(page, y)

  y -= 14; t(page, 'РАЗДЕЛ А — ПРОДАЖБИ', 40, y, bold, 11)
  for (const [lbl, base_, vat] of [
    ['20% ставка', data.salesBase20, data.vatOut20],
    ['9% ставка',  data.salesBase9,  data.vatOut9],
    ['0% / освободени', data.salesBase0, null],
  ] as [string, number, number | null][]) {
    y -= 16
    t(page, lbl, 50, y, font)
    t(page, `База: ${base_.toFixed(2)} EUR`, 220, y, font)
    if (vat !== null) t(page, `ДДС: ${vat.toFixed(2)} EUR`, 400, y, font)
  }
  y -= 20; ln(page, y)

  y -= 14; t(page, 'РАЗДЕЛ Б — ПОКУПКИ', 40, y, bold, 11)
  for (const [lbl, base_, vat] of [
    ['20% ставка', data.purchasesBase20, data.vatIn20],
    ['9% ставка',  data.purchasesBase9,  data.vatIn9],
  ] as [string, number, number][]) {
    y -= 16
    t(page, lbl, 50, y, font)
    t(page, `База: ${base_.toFixed(2)} EUR`, 220, y, font)
    t(page, `ДДС: ${vat.toFixed(2)} EUR`, 400, y, font)
  }
  y -= 20; ln(page, y)

  y -= 14
  const col = vatPayable > 0 ? rgb(0.8, 0.1, 0.1) : rgb(0.1, 0.6, 0.2)
  const res = vatPayable > 0
    ? `ДДС ЗА ВНАСЯНЕ: ${vatPayable.toFixed(2)} EUR`
    : vatRefund > 0
    ? `ДДС ЗА ВЪЗСТАНОВЯВАНЕ: ${vatRefund.toFixed(2)} EUR`
    : 'НУЛЕВ РЕЗУЛТАТ'
  t(page, res, 40, y, bold, 12, col)

  y -= 60
  t(page, `Дата: ${new Date().toLocaleDateString('bg-BG')}`, 40, y, font, 9, rgb(0.5, 0.5, 0.5))
  t(page, 'Подпис: ____________________', 360, y, font, 9, rgb(0.5, 0.5, 0.5))

  dl(await doc.save(), `DDS_draft_${data.period}.pdf`)
}

export async function generateZKPOPdf(data: ZKPOFormData & { taxableProfit?: number; corporateTax?: number; taxDue?: number }) {
  const { doc, page, font, bold } = await base()
  const taxableProfit = data.taxableProfit ?? Math.max(data.accountingProfit + data.nonDeductibleExpenses, 0)
  const corporateTax  = data.corporateTax  ?? taxableProfit * 0.10
  const taxDue        = data.taxDue        ?? Math.max(corporateTax - data.advancePaid, 0)
  let y = 800

  t(page, '[ЧЕРНОВА — не е официален бланк на НАП]', 40, y, font, 8, rgb(0.6, 0.3, 0))
  y -= 18; t(page, 'ГОДИШНА ДАНЪЧНА ДЕКЛАРАЦИЯ ПО ЗКПО', 40, y, bold, 14)
  y -= 16; t(page, `Година: ${data.year}   Краен срок: 30 април ${data.year + 1}   Валута: EUR`, 40, y, font)
  y -= 24; ln(page, y)

  y -= 14; t(page, `Фирма: ${data.companyName}   ЕИК: ${data.eik}`, 40, y, font)
  y -= 20; ln(page, y)

  y -= 14; t(page, 'ФИНАНСОВ РЕЗУЛТАТ', 40, y, bold, 11)
  for (const [lbl, val] of [
    ['Общо приходи',               data.totalRevenue],
    ['Общо разходи',               data.totalExpenses],
    ['Счетоводна печалба / загуба', data.accountingProfit],
    ['Непризнати разходи (ЗКПО)',  data.nonDeductibleExpenses],
    ['Данъчна печалба',            taxableProfit],
  ] as [string, number][]) {
    y -= 16; t(page, lbl, 50, y, font); t(page, `${val.toFixed(2)} EUR`, 420, y, font)
  }
  y -= 20; ln(page, y)

  y -= 14; t(page, 'ДАНЪК', 40, y, bold, 11)
  for (const [lbl, val] of [
    ['Корпоративен данък (10%)',   corporateTax],
    ['Платени авансови вноски',    data.advancePaid],
  ] as [string, number][]) {
    y -= 16; t(page, lbl, 50, y, font); t(page, `${val.toFixed(2)} EUR`, 420, y, font)
  }
  y -= 20; ln(page, y)

  y -= 14
  const col = taxDue > 0 ? rgb(0.8, 0.1, 0.1) : rgb(0.1, 0.6, 0.2)
  t(page,
    taxDue > 0
      ? `ДАНЪК ЗА ДОВНАСЯНЕ: ${taxDue.toFixed(2)} EUR`
      : `НАДВНЕСЕН ДАНЪК: ${taxDue.toFixed(2)} EUR`,
    40, y, bold, 12, col)

  y -= 60
  t(page, `Дата: ${new Date().toLocaleDateString('bg-BG')}`, 40, y, font, 9, rgb(0.5, 0.5, 0.5))
  t(page, 'Подпис: ____________________', 360, y, font, 9, rgb(0.5, 0.5, 0.5))

  dl(await doc.save(), `ZKPO_draft_${data.year}.pdf`)
}
