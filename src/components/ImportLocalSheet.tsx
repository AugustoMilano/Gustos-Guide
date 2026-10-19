import { useRef } from 'react'
import { Modal } from './Modal.tsx'
import type { ImportOffer } from '../state/AppState.tsx'

export function ImportLocalSheet({
  offer,
  onAccept,
  onDismiss,
}: {
  offer: ImportOffer
  onAccept: () => void
  onDismiss: () => void
}) {
  const focus = useRef<HTMLButtonElement>(null)
  const bits = [
    offer.places ? `${offer.places} places` : '',
    offer.guides ? `${offer.guides} guides` : '',
    offer.photos ? `${offer.photos} photos` : '',
  ].filter(Boolean)
  return (
    <Modal onClose={onDismiss} label="Import this browser" initialFocusRef={focus}>
      <div className="p-5">
        <h2 className="font-serif text-4xl italic">Bring this browser with you?</h2>
        <p className="mt-2 text-sm">
          This phone still has {bits.join(', ')} from before you signed in. Import them into your account, or leave them here.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button ref={focus} type="button" className="btn btn-coral" onClick={onAccept}>Import</button>
          <button type="button" className="btn" onClick={onDismiss}>Not now</button>
        </div>
      </div>
    </Modal>
  )
}
