import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { getSession } from '../lib/session'
import { IkonDompet } from '../components/icons'
import { Tombol } from '../components/ui'

export default function Login() {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      })
      const json = await res.json()
      if (res.ok) {
        router.push('/')
      } else {
        setError(json.error || 'Login gagal.')
        setPin('')
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    }
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>Masuk — Personal Tracker</title>
      </Head>

      <div className="bungkus">
        <div className="kartu">
          <div className="kepala">
            <span className="ikon" aria-hidden="true"><IkonDompet width={28} height={28} /></span>
            <h1>Personal Tracker</h1>
            <p className="sub">Masuk untuk melanjutkan</p>
          </div>

          <form onSubmit={handleLogin} className="form">
            <div className="f">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                required
                maxLength={100}
              />
            </div>

            <div className="f">
              <label htmlFor="pin">PIN</label>
              <input
                id="pin"
                type="password"
                autoComplete="current-password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="••••••"
                required
                maxLength={100}
                className="pin"
              />
            </div>

            {error && <div className="galat" role="alert">{error}</div>}

            <Tombol type="submit" varian="primer"
              disabled={loading || !username || !pin}
              anak={loading ? 'Masuk…' : 'Masuk'} />
          </form>

          <p className="catatan">Akses terbatas. Tidak ada registrasi publik.</p>
        </div>
      </div>

      <style jsx>{`
        .bungkus {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: var(--bg); padding: var(--space-5);
        }
        .kartu {
          background: var(--surface);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-card);
          padding: var(--space-8) var(--space-7);
          width: 100%; max-width: 380px;
        }
        .kepala { text-align: center; margin-bottom: var(--space-6); }
        .ikon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 56px; height: 56px; margin: 0 auto var(--space-3);
          background: var(--accent-soft);
          border: var(--border-width) solid var(--accent-line);
          border-radius: var(--radius-md);
          color: var(--accent);
        }
        h1 {
          font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700;
          color: var(--ink); letter-spacing: var(--tracking-tight); margin-bottom: 4px;
        }
        .sub { font-size: var(--text-sm); color: var(--muted); }

        .form { display: flex; flex-direction: column; gap: var(--space-4); }
        .f { display: flex; flex-direction: column; gap: var(--space-2); }
        .f label {
          font-size: var(--text-xs); letter-spacing: var(--tracking-label);
          text-transform: uppercase; color: var(--muted);
        }
        .f :global(input.pin) { font-size: var(--text-xl); letter-spacing: 0.3em; }

        .galat {
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-sm);
          font-size: var(--text-sm);
          background: var(--danger-soft); color: var(--danger);
        }

        .form :global(button) { margin-top: var(--space-1); width: 100%; }

        .catatan {
          text-align: center; font-size: var(--text-xs); color: var(--muted);
          margin-top: var(--space-5);
        }
      `}</style>
    </>
  )
}

// Redirect ke home kalau sudah login. Dulu ke /money, beda dari tujuan
// setelah login berhasil (/) — dua jalur, dua tujuan. Disamakan.
export async function getServerSideProps({ req, res }) {
  const session = await getSession(req, res)
  if (session?.user?.authenticated) {
    return { redirect: { destination: '/', permanent: false } }
  }
  return { props: {} }
}
