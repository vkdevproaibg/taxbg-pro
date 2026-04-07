import ImportPlatform from './ImportPlatform'
import PlatformHistory from './PlatformHistory'

export default function PlatformsModule() {
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Приходи от платформи</h1>
        <p className="mt-1 text-sm text-slate-400">
          App Store, Google Play, Stripe — импорт на месечни отчети
        </p>
      </div>
      <ImportPlatform />
      <PlatformHistory />
    </div>
  )
}
