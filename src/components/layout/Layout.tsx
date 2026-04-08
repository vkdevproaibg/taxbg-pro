import type { PropsWithChildren } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomBar from './BottomBar'
import HelpPopover from '../ui/HelpPopover'

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[--surface]">
      <div className="shrink-0">
        <Topbar />
        <div className="embroidery-band" aria-hidden="true" />
      </div>

      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="bg-folk-pattern flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <div className="shrink-0">
        <div className="embroidery-band" aria-hidden="true" />
        <BottomBar />
      </div>

      <HelpPopover />
    </div>
  )
}
