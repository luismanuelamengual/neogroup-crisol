import './index.scss'

/** Full-area loading overlay: a flickering flame inside a slowly turning ring of runes. */
export default function Loading({ message }: { message?: string }) {
  return (
    <div className="loading-screen">
      <div className="wrapper">
        <div className="seal">
          <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="46" />
            <circle cx="50" cy="50" r="40" className="runes" />
          </svg>
          <svg className="flame" viewBox="0 0 24 32" aria-hidden="true">
            <path d="M12 0c1.5 6-6 9.5-6 18a6 6 0 0 0 12 0c0-3-1.5-5-3-6.5.5 3-1 4.5-2.5 4.5 0-6 3-9.5-.5-16z" />
            <path className="core" d="M12 20c-1.5 1.5-2.5 2.8-2.5 4.5a2.5 2.5 0 0 0 5 0c0-1.7-1-3-2.5-4.5z" />
          </svg>
        </div>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  )
}
