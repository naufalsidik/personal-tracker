import { Html, Head, Main, NextScript } from 'next/document'

// Favicon sebagai data URI, bukan berkas di public/. Tidak ada folder
// public/ di proyek ini (lihat next.config.js), dan bikin satu cuma untuk
// satu ikon kecil terasa berlebihan. Bentuknya ikon dompet yang sama
// dengan sidebar, warna aksen teal yang sama dengan tokens.css.
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
  `<rect width="24" height="24" rx="5" fill="#0C6E75"/>` +
  `<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19H19a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 1 3 7.5z" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<circle cx="16.5" cy="14" r="1.1" fill="#fff"/>` +
  `</svg>`
const FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}`

// Dijalankan sebelum React mount. Tanpa ini, halaman sempat tampil
// terang lalu berkedip ke gelap begitu komponen selesai dipasang.
const TEMA_AWAL = `
(function(){
  try {
    var t = localStorage.getItem('tema');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`

export default function Document() {
  return (
    <Html lang="id" data-theme="light">
      <Head>
        <link rel="icon" href={FAVICON_HREF} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:wght@500;600;700;800&family=Source+Sans+3:ital,wght@0,300..700;1,400&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: TEMA_AWAL }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
