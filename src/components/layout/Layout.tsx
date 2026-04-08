import type { PropsWithChildren } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import HelpPopover from '../ui/HelpPopover'

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen bg-[--surface]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <HelpPopover />
    </div>
  )
}
