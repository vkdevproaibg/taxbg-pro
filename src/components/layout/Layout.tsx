import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomBar from './BottomBar'
import HelpPopover from '../ui/HelpPopover'
import CookieBanner from '../ui/CookieBanner'
import PurgeBanner from '../ui/PurgeBanner'
import SupportButton from '../ui/SupportButton'

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[--surface]">
      <PurgeBanner />

      <div className="shrink-0">
        <Topbar />
        <div className="embroidery-band" aria-hidden="true" />
      </div>

      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="bg-folk-pattern flex-1 overflow-auto">
          {children}
          <footer className="mt-8 border-t border-slate-200 px-6 pb-4 pt-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <Link to="/privacy" className="hover:text-slate-600 hover:underline">Privacy Policy</Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-slate-600 hover:underline">Terms of Service</Link>
              <span>·</span>
              <Link to="/ai-disclosure" className="hover:text-slate-600 hover:underline">AI Disclosure</Link>
              <span className="ml-auto">© 2026 TaxBG Pro</span>
            </div>
          </footer>
        </main>
      </div>

      <div className="shrink-0">
        <div className="embroidery-band" aria-hidden="true" />
        <BottomBar />
      </div>

      <HelpPopover />
      <CookieBanner />
      <SupportButton />
    </div>
  )
}
