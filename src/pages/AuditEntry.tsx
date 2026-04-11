import EntryAuditWizard from '../modules/entry-audit/EntryAuditWizard'
import { useNavigate }   from 'react-router-dom'

export default function AuditEntry() {
  const navigate = useNavigate()
  return (
    <EntryAuditWizard onComplete={() => navigate('/')} />
  )
}
