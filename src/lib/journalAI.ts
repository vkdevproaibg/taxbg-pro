import type { Transaction } from '../store/accountingStore'
import { useJournalStore, type JournalEntry } from '../store/journalStore'
import { llmChat } from './llm'

// Ensure the opening capital contribution exists as a journal entry:
//   Дт 503 (bank) / Кт 102 (registered capital)
// This makes the balance sheet work from day one.
export function ensureCapitalEntry(
  capitalEur: number = 1,
  companyCreatedDate: string = new Date().toISOString().slice(0, 10),
): void {
  const journal = useJournalStore.getState()
  const hasCapital = journal.entries.some(
    (e) => e.creditAccount === '102' || e.creditAccount === '101'
  )
  if (hasCapital || capitalEur <= 0) return

  journal.addEntry({
    date: companyCreatedDate,
    debitAccount:  '503',
    creditAccount: '102',
    amount: capitalEur,
    description: 'Внасяне на основен капитал',
    linkedTransactionId: undefined,
    source: 'auto',
    period: companyCreatedDate.slice(0, 7),
  })
}

const TRANSACTION_RULES: Record<
  string,
  {
    debit: string
    credit: string
    description: (t: Transaction) => string
  }
> = {
  income: {
    debit: '503',
    credit: '703',
    description: (t) => `Приход от ${t.counterparty ?? 'клиент'}: ${t.description}`,
  },
  vat_out: {
    debit: '503',
    credit: '703',
    description: (t) => `Продажба с ДДС: ${t.description}`,
  },
  expense: {
    debit: '602',
    credit: '503',
    description: (t) => `Разход за услуга: ${t.description}`,
  },
  vat_in: {
    debit: '602',
    credit: '503',
    description: (t) => `Покупка с данъчен кредит: ${t.description}`,
  },
  salary: {
    debit: '604',
    credit: '503',
    description: (t) => `Заплата: ${t.description}`,
  },
  dividend: {
    debit: '493',
    credit: '503',
    description: (t) => `Дивидент на собственик: ${t.description}`,
  },
  appstore: {
    debit: '503',
    credit: '703',
    description: (t) => `App Store приход: ${t.description}`,
  },
  googleplay: {
    debit: '503',
    credit: '703',
    description: (t) => `Google Play приход: ${t.description}`,
  },
  stripe: {
    debit: '503',
    credit: '703',
    description: (t) => `Stripe приход: ${t.description}`,
  },
  asset_purchase: {
    debit: '205',
    credit: '503',
    description: (t) => `Покупка ДА: ${t.assetName ?? t.description}`,
  },
  depreciation: {
    debit: '603',
    credit: '241',
    description: (t) => `Амортизация: ${t.assetName ?? t.description}`,
  },
  vehicle_tax: {
    debit: '606',
    credit: '503',
    description: (t) => `Данък МПС ${t.municipality ?? ''}: ${t.description}`,
  },
  vehicle_expense: {
    debit: '602',
    credit: '503',
    description: (t) => `Разход МПС: ${t.description}`,
  },
  refund: {
    debit: '703',
    credit: '503',
    description: (t) => `Refund/отписка: ${t.description}`,
  },
}

export function transactionToJournalEntry(
  transaction: Transaction
): Omit<JournalEntry, 'id'> | null {
  const rule = TRANSACTION_RULES[transaction.type]
  if (!rule) return null

  const amount =
    transaction.type === 'vehicle_expense'
      ? transaction.amount * (transaction.deductiblePercent ?? 0.5)
      : transaction.amount

  return {
    date: transaction.date,
    description: rule.description(transaction),
    debitAccount: rule.debit,
    creditAccount: rule.credit,
    amount,
    vatAmount: transaction.vatAmount,
    counterparty: transaction.counterparty,
    invoiceNumber: transaction.invoiceNumber,
    linkedTransactionId: transaction.id,
    source: 'auto',
    aiSuggested: false,
    period: transaction.date.slice(0, 7),
  }
}

export function createVatJournalEntry(
  transaction: Transaction
): Omit<JournalEntry, 'id'> | null {
  if (transaction.type !== 'vat_out' || !transaction.vatAmount) return null

  return {
    date: transaction.date,
    description: `ДДС върху продажба: ${transaction.description}`,
    debitAccount: '503',
    creditAccount: '451',
    amount: transaction.vatAmount,
    linkedTransactionId: transaction.id,
    source: 'auto',
    aiSuggested: false,
    period: transaction.date.slice(0, 7),
  }
}

/**
 * Creates a VAT input credit journal entry for purchases with VAT (vat_in).
 *
 * When a company buys goods/services with VAT and has the right to
 * данъчен кредит (tax credit), the VAT amount is recorded as:
 *   Дт 452 (ДДС за възстановяване / данъчен кредит)
 *   Кт 401 (Задължения към доставчици)
 *
 * This mirrors createVatJournalEntry() which handles vat_out → account 451.
 *
 * The balance sheet calculates VAT payable as: 451 credit - 452 debit.
 * Without this entry, 452 is never debited and VAT payable is overstated.
 */
export function createVatInputCreditEntry(
  transaction: Transaction
): Omit<JournalEntry, 'id'> | null {
  if (transaction.type !== 'vat_in' || !transaction.vatAmount) return null

  return {
    date: transaction.date,
    description: `Данъчен кредит ДДС: ${transaction.description}`,
    debitAccount:  '452',   // ДДС за възстановяване (данъчен кредит)
    creditAccount: '401',   // Задължения към доставчици
    amount: transaction.vatAmount,
    linkedTransactionId: transaction.id,
    source: 'auto',
    aiSuggested: false,
    period: transaction.date.slice(0, 7),
  }
}

export async function suggestJournalEntryAI(
  description: string,
  amount: number,
  apiKey?: string
): Promise<{ debit: string; credit: string; explanation: string } | null> {
  const prompt = `Ты - болгарский бухгалтер. Определи проводку по Националния сметкоплан Болгарии.

Операция: "${description}"
Сумма: ${amount} EUR

Ответь ТОЛЬКО в JSON:
{
  "debit": "код счёта дебит (3 цифры)",
  "credit": "код счёта кредит (3 цифры)",
  "explanation": "краткое объяснение на русском (1 предложение)"
}

Используй только счета: 205, 206, 241, 246, 401, 411, 421, 451, 452, 453, 461, 493, 501, 503, 601, 602, 603, 604, 605, 606, 609, 703, 705, 729, 101, 122, 123`

  try {
    const response = await llmChat([{ role: 'user', content: prompt }], {
      maxTokens: 200,
      temperature: 0.1,
      apiKey,
    })

    const json = response.content.match(/\{[\s\S]*\}/)
    if (!json) return null
    return JSON.parse(json[0]) as { debit: string; credit: string; explanation: string }
  } catch {
    return null
  }
}
