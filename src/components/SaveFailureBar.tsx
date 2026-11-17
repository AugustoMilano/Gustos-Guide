import { useApp } from '../state/AppState.tsx'

/** On-screen notice when a save did not reach the account, with Retry. Stays until it saves or is dismissed. */
export function SaveFailureBar() {
  const app = useApp()
  const failure = app.saveFailure
  if (!failure) return null
  const what = failure.count > 1 ? `${failure.count} changes` : `Your ${failure.what}`
  return (
    <div className="save-failure" role="alert" data-save-failure>
      <div className="min-w-0">
        <p className="font-bold">{what} did not save.</p>
        <p className="text-sm save-failure-detail">{/[.!?]$/.test(failure.message) ? failure.message : `${failure.message}.`} It is still on this device.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn btn-coral text-sm" disabled={failure.retrying} onClick={() => void app.retrySaves()}>
          {failure.retrying ? 'Retrying…' : 'Retry'}
        </button>
        <button type="button" className="btn text-sm" aria-label="Dismiss" onClick={app.dismissSaveFailure}>✕</button>
      </div>
    </div>
  )
}
