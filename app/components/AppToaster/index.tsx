'use client'

import toast, { ToastBar, Toaster } from 'react-hot-toast'

/**
 * Global toast container. Tapping a toast dismisses it right away.
 */
export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      // Below the top HUD row (location, gold, buttons) so it never covers it.
      containerStyle={{ top: 'calc(70px + var(--safe-top))' }}
      toastOptions={{
        style: {
          background: 'var(--frame-background)',
          color: 'var(--color-text)',
          border: 'var(--frame-border)',
          borderRadius: 3,
          boxShadow: 'var(--frame-shadow)',
          fontWeight: 700,
          cursor: 'pointer'
        }
      }}
    >
      {(t) => (
        <div onClick={() => toast.dismiss(t.id)} role="button" aria-label="dismiss">
          <ToastBar toast={t} />
        </div>
      )}
    </Toaster>
  )
}
