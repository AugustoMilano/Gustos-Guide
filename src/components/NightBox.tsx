export function NightBox({
  id,
  value,
  onChange,
  onSubmit,
  examples,
  placeholder,
  rows = 3,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  examples: { label: string; query: string }[]
  placeholder: string
  rows?: number
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(value.trim())
      }}
    >
      <label className="field" htmlFor={id}>
        <span>What sounds good?</span>
        <textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={400}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-coral mt-3" disabled={!value.trim()}>Plan it</button>
      {examples.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example.label}
              type="button"
              className="chip"
              onClick={() => {
                onChange(example.query)
                onSubmit(example.query)
              }}
            >
              {example.label}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  )
}
