import './index.scss'

/** Full-area loading overlay: a spinning globe with a bouncing pin. */
export default function Loading({ message }: { message?: string }) {
  return (
    <div className="loading-screen">
      <div className="wrapper">
        <div className="globe">
          <div className="meridians" />
        </div>
        <svg className="pin" viewBox="0 0 24 32" aria-hidden="true">
          <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 32 12 32s12-11.6 12-20.3C24 5.2 18.6 0 12 0z" />
          <circle cx="12" cy="11.5" r="5" />
        </svg>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  )
}
