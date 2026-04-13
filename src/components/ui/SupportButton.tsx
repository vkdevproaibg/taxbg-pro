import { useState } from 'react'
import SupportModal from './SupportModal'

export default function SupportButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Support"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9990,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--accent, #00966E)',
          color: 'white',
          fontSize: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)'
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        {/* LifeBuoy icon (SVG) */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
          <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
          <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
          <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
          <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
        </svg>
      </button>
      <SupportModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
