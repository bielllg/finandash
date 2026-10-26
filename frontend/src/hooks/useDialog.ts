import { useEffect, useRef } from 'react'

export function useDialog(onClose: () => void, enabled = true) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!enabled) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = ref.current
    const appShell = document.getElementById('app-shell')
    const wasInert = appShell?.inert ?? false
    const overflow = document.body.style.overflow
    if (appShell) appShell.inert = true
    document.body.style.overflow = 'hidden'
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select, textarea, [tabindex="0"]') ?? []).filter(el => el.getClientRects().length > 0)
    dialog?.focus()
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current() }
      if (e.key !== 'Tab') return
      const items = focusable()
      const first = items[0], last = items[items.length - 1]
      if (!first) { e.preventDefault(); return }
      if (!dialog?.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handle, true)
    return () => {
      document.removeEventListener('keydown', handle, true)
      document.body.style.overflow = overflow
      if (appShell) appShell.inert = wasInert
      previous?.focus()
    }
  }, [enabled])
  return ref
}
