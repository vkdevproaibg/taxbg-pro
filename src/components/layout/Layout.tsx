import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomBar from './BottomBar'
import MobileNav from './MobileNav'
import HelpPopover from '../ui/HelpPopover'
import CookieBanner from '../ui/CookieBanner'
import PurgeBanner from '../ui/PurgeBanner'
import SupportButton from '../ui/SupportButton'
import { useSidebarStore } from '../../store/sidebarStore'

export default function Layout({ children }: PropsWithChildren) {
  const isOpen = useSidebarStore((s) => s.isOpen)
  const close = useSidebarStore((s) => s.close)

  return (
    <div className="flex flex-col overflow-hidden bg-[--surface]" style={{ height: '100dvh' }}>
      <PurgeBanner />

      <div className="shrink-0">
        <Topbar />
        <div className="embroidery-band hidden md:block" aria-hidden="true" />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Mobile overlay — behind sidebar drawer, above content */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={close}
            aria-hidden="true"
          />
        )}

        <Sidebar />

        <main className="bg-folk-pattern flex-1 overflow-auto pb-16 md:pb-0">
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

      {/* Desktop bottom bar */}
      <div className="hidden md:block shrink-0">
        <div className="embroidery-band" aria-hidden="true" />
        <BottomBar />
      </div>

      {/* Mobile bottom tab navigation */}
      <MobileNav />

      <HelpPopover />
      <CookieBanner />
      <SupportButton />
    </div>
  )
}
