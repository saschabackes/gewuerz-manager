import { useEffect, useRef, useState } from 'react'
import { lookupBarcode } from '../utils/productLookup'

export default function BarcodeScanner({ onDetected, onClose }) {
  const instanceRef = useRef(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [looking, setLooking] = useState(false)
  const [cameras, setCameras] = useState([])
  const [activeCamId, setActiveCamId] = useState(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const detectedRef = useRef(false)

  useEffect(() => {
    startScanner(null)
    return () => { instanceRef.current?.stop().catch(() => {}) }
  }, [])

  // Hochauflösende Constraints mit kontinuierlichem Autofokus
  function buildConstraints(cameraId) {
    const base = {
      width:  { ideal: 1920 },
      height: { ideal: 1080 },
      focusMode: 'continuous',
      advanced: [{ focusMode: 'continuous' }],
    }
    return cameraId
      ? { deviceId: { exact: cameraId }, ...base }
      : { facingMode: { ideal: 'environment' }, ...base }
  }

  async function detectTorch() {
    try {
      const caps = instanceRef.current?.getRunningTrackCapabilities?.()
      if (caps && 'torch' in caps) setTorchAvailable(true)
      // Autofokus nachträglich erzwingen (falls Start-Constraint ignoriert wurde)
      await instanceRef.current?.applyVideoConstraints?.({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
    } catch { /* ignore */ }
  }

  async function toggleTorch() {
    try {
      const next = !torchOn
      await instanceRef.current?.applyVideoConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch { /* ignore */ }
  }

  async function handleDecode(decodedText) {
    if (detectedRef.current) return
    detectedRef.current = true
    if (navigator.vibrate) navigator.vibrate(100)
    instanceRef.current?.pause(true)
    setLooking(true)
    const productData = await lookupBarcode(decodedText)
    setLooking(false)
    onDetected(decodedText, productData)
  }

  async function startScanner(cameraId) {
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')

      if (!cameraId) {
        const devices = await Html5Qrcode.getCameras()
        if (!devices?.length) { setError('Keine Kamera gefunden.'); setLoading(false); return }
        setCameras(devices)
        const back = devices.find(d => /back|rear|environment|rück/i.test(d.label))
        cameraId = back ? back.id : devices[devices.length - 1].id
        setActiveCamId(cameraId)
      }

      const scanner = new Html5Qrcode('qr-reader-container', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        useBarCodeDetectorIfSupported: true,   // native Decoder nutzen, wenn vorhanden
      })
      instanceRef.current = scanner

      await scanner.start(
        buildConstraints(cameraId),
        {
          fps: 10,
          qrbox: (vw, vh) => {
            const w = Math.round(Math.min(vw * 0.92, 340))
            return { width: w, height: Math.round(Math.min(vh * 0.6, 160)) }
          },
        },
        handleDecode,
        () => {}
      )

      setTimeout(() => {
        const canvas = document.querySelector('#qr-reader-container canvas')
        if (canvas) canvas.style.display = 'none'
        detectTorch()
      }, 400)

      setLoading(false)
    } catch (err) {
      const msg = err?.message ?? String(err)
      if (/permission|NotAllowed/i.test(msg)) setError('Kamerazugriff verweigert.')
      else if (/NotFound|no device/i.test(msg)) setError('Keine Kamera gefunden.')
      else setError(`Fehler: ${msg}`)
      setLoading(false)
    }
  }

  async function switchCamera(camId) {
    await instanceRef.current?.stop().catch(() => {})
    instanceRef.current = null
    detectedRef.current = false
    setTorchOn(false)
    setTorchAvailable(false)
    setActiveCamId(camId)
    setLoading(true)
    startScanner(camId)
  }

  function submitManual() {
    const code = manualCode.replace(/\D/g, '')
    if (code.length < 6) return
    handleDecode(code)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50 fade-enter" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl pointer-events-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Barcode scannen</h3>
              <p className="text-xs text-gray-400">EAN-13 / EAN-8 / UPC / Code128</p>
            </div>
            <div className="flex items-center gap-1">
              {torchAvailable && (
                <button onClick={toggleTorch}
                  className={`p-2 rounded-full transition-colors ${torchOn ? 'bg-yellow-400 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}
                  title="Taschenlampe">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Kamera-Auswahl */}
          {cameras.length > 1 && (
            <div className="px-4 pt-2 flex gap-2 flex-wrap">
              {cameras.map((cam, i) => (
                <button key={cam.id} onClick={() => switchCamera(cam.id)}
                  className={`text-xs rounded-full px-3 py-1 font-medium transition-colors ${
                    activeCamId === cam.id ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                  {cam.label || `Kamera ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Kamerabild */}
          <div className="relative bg-black" style={{ minHeight: 200 }}>
            {(loading || looking) && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80">
                <div className="text-white text-center px-6">
                  <svg className="w-8 h-8 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <p className="text-sm font-medium">{looking ? 'Produkt wird gesucht…' : 'Kamera wird gestartet…'}</p>
                  {looking && <p className="text-xs text-gray-300 mt-1">Open Food Facts wird abgefragt</p>}
                </div>
              </div>
            )}
            <div id="qr-reader-container" className="w-full" />
          </div>

          {/* Hinweis / Fehler / Manuell */}
          <div className="px-4 py-3">
            {error ? (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3 mb-3">{error}</div>
            ) : !loading && !looking && (
              <p className="text-xs text-gray-400 text-center mb-3">
                Barcode in den Rahmen halten · ca. 10–20 cm · bei wenig Licht 🔦 nutzen
              </p>
            )}

            {showManual ? (
              <div className="mb-3">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Barcode-Nummer eingeben</label>
                <div className="flex gap-2">
                  <input
                    type="text" inputMode="numeric" autoFocus
                    className="input flex-1 py-2.5 text-sm" placeholder="z.B. 4002971000122"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitManual()}
                  />
                  <button onClick={submitManual} disabled={manualCode.replace(/\D/g, '').length < 6}
                    className="btn-primary px-4 py-2.5 text-sm flex-none disabled:opacity-50">Suchen</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowManual(true)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-full text-center mb-3 transition-colors">
                Scan klappt nicht? Nummer manuell eingeben
              </button>
            )}

            <button onClick={onClose} className="btn-secondary w-full">Abbrechen</button>
          </div>
        </div>
      </div>
    </>
  )
}
