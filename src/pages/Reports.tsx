import ReportsModule from '../modules/reports'
import { useCompanyDataReady } from '../hooks/useCompanyData'

export default function Reports() {
  const dataReady = useCompanyDataReady()
  if (!dataReady) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    )
  }
  return <ReportsModule />
}
