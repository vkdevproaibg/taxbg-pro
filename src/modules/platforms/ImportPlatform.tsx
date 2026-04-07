import { useRef, useState } from 'react'
import { useAccountingStore } from '../../store/accountingStore'
import { parseAppStoreCsv, parseGooglePlayCsv, detectPlatform } from '../../lib/platformImport'
import type { ImportResult } from '../../lib/platformImport'

export default function ImportPlatform() {
  const addTransaction = useAccountingStore((s) => s.addTransaction)
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [imported, setImported] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const platform = detectPlatform(text)
    let res: ImportResult
    if (platform === 'appstore') {
      res = parseAppStoreCsv(text)
    } else if (platform === 'googleplay') {
      res = parseGooglePlayCsv(text)
    } else {
      const a = parseAppStoreCsv(text)
      const g = parseGooglePlayCsv(text)
      res = a.transactions.length >= g.transactions.length ? a : g
      if (res.transactions.length === 0) {
        res.errors.push('Не може да се разпознае форматът. Очаква се App Store или Google Play CSV.')
      }
    }
    setResult(res)
    setImported(false)
  }

  const handleImport = () => {
    if (!result) return
    result.transactions.forEach((tx) => addTransaction(tx))
    setImported(true)
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-medium text-slate-700">Как да изтеглите отчета</h3>
        <div className="space-y-2 text-sm text-slate-500">
          <div className="flex gap-3 rounded-lg bg-slate-50 p-3">
            <span className="text-lg">🍎</span>
            <div>
              <p className="font-medium text-slate-600">App Store Connect</p>
              <p>Payments and Financial Reports → Financial → Download CSV</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg bg-slate-50 p-3">
            <span className="text-lg">▶</span>
            <div>
              <p className="font-medium text-slate-600">Google Play Console</p>
              <p>Reports → Financial reports → Earnings → Export CSV</p>
            </div>
          </div>
          <p className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
            ⚠ Apple и Google удържат ДДС сами — не начислявайте ДДС върху тези приходи в декларацията по ДДС
          </p>
        </div>
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleFile} className="hidden" />
        <p className="mb-3 text-sm text-slate-500">Изберете месечния CSV отчет от App Store или Google Play</p>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Избери CSV файл
        </button>
      </div>

      {/* Preview */}
      {result && (
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">{result.summary.platform}</span>
            <span className="text-xs text-slate-400">{result.summary.period}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-green-50 p-3">
              <div className="text-lg font-bold text-green-600">{result.summary.totalNet.toFixed(2)} €</div>
              <div className="text-xs text-slate-400">Нетен приход</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-lg font-bold text-slate-700">{result.summary.count}</div>
              <div className="text-xs text-slate-400">Транзакции</div>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <div className="text-lg font-bold text-red-500">{result.summary.refunds}</div>
              <div className="text-xs text-slate-400">Refund-а</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-600">
              {result.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {result.transactions.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {result.transactions.slice(0, 8).map((tx, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-500 bg-slate-50 rounded px-3 py-2">
                  <span className="shrink-0">{tx.date}</span>
                  <span className="flex-1 px-2 truncate">{tx.description}</span>
                  <span className={tx.type === 'refund' ? 'text-red-500' : 'text-green-600'}>
                    {tx.type === 'refund' ? '−' : '+'}{tx.amount.toFixed(2)} €
                  </span>
                </div>
              ))}
              {result.transactions.length > 8 && (
                <p className="text-xs text-slate-400 text-center py-1">
                  +{result.transactions.length - 8} още транзакции
                </p>
              )}
            </div>
          )}

          {!imported ? (
            <button
              onClick={handleImport}
              disabled={result.transactions.length === 0}
              className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
            >
              Импортирай {result.transactions.length} транзакции в бухгалтерията
            </button>
          ) : (
            <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-sm text-green-700 text-center">
              ✓ Импортирани успешно — виждате ги в Бухгалтерия
            </div>
          )}
        </div>
      )}
    </div>
  )
}
