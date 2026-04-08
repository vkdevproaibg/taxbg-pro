import type { PropsWithChildren } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import HelpPopover from '../ui/HelpPopover'

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-[--surface]">
      <Topbar />
      <div className="embroidery-band" aria-hidden="true" />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="bg-folk-pattern flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <HelpPopover />
    </div>
  )
}
