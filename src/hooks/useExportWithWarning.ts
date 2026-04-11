import { useCallback, useState } from 'react'
import {
  computeRetainUntil,
  recordAcknowledgement,
  type RetentionClass,
} from '../lib/exportAcknowledgement'

export interface ExportRequest {
  documentName: string
  retentionClass: RetentionClass
  legalBasis: string
  documentId?: string
  onConfirm: () => void
}

interface PendingExport extends ExportRequest {
  retainUntil: string
}

function sessionKey(rc: RetentionClass): string {
  return `taxbg-export-ack-${rc}`
}

function hasSessionAck(rc: RetentionClass): boolean {
  try {
    return sessionStorage.getItem(sessionKey(rc)) === '1'
  } catch {
    return false
  }
}

function markSessionAck(rc: RetentionClass): void {
  try {
    sessionStorage.setItem(sessionKey(rc), '1')
  } catch {
    // ignore
  }
}

export function useExportWithWarning() {
  const [pending, setPending] = useState<PendingExport | null>(null)

  const exportWithWarning = useCallback((req: ExportRequest) => {
    if (req.retentionClass === 'general_3y') {
      req.onConfirm()
      return
    }

    const retainUntil = computeRetainUntil(req.retentionClass)

    if (hasSessionAck(req.retentionClass)) {
      void recordAcknowledgement({
        documentId: req.documentId,
        documentName: req.documentName,
        retentionClass: req.retentionClass,
        retainUntil,
        legalBasis: req.legalBasis,
        ackType: 'export_warning',
      })
      req.onConfirm()
      return
    }

    setPending({ ...req, retainUntil })
  }, [])

  const confirm = useCallback(() => {
    if (!pending) return
    markSessionAck(pending.retentionClass)
    void recordAcknowledgement({
      documentId: pending.documentId,
      documentName: pending.documentName,
      retentionClass: pending.retentionClass,
      retainUntil: pending.retainUntil,
      legalBasis: pending.legalBasis,
      ackType: 'export_warning',
    })
    pending.onConfirm()
    setPending(null)
  }, [pending])

  const closeModal = useCallback(() => setPending(null), [])

  return {
    exportWithWarning,
    confirm,
    closeModal,
    pending,
    isOpen: pending !== null,
  }
}
