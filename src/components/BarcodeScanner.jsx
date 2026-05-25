import { useEffect, useRef, useState } from 'react'
import { lookupBarcode } from '../utils/productLookup'

export default function BarcodeScanner({ onDetected, onClose }) {
  const instanceRef = useRef(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [looking, setLooking] = useState(false)  // Produktsuche läuft
  const [cameras, setCameras] = useState([])
  const [activeCamId, setActiveCamId] = useState(null)
  const detectedRef = useRef(false)              // verhindert Mehrfach-Scan

  useEffect(() => {
    startScanner(null)
    return () => { instanceRef.current?.stop().catch(() => {}) }
  }, [])

  async function startScanner(cameraId) {
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')

      if (!cameraId) {
        const devices = await Html5Qrcode.getCameras()
        if (!devices?.length) { setError('Keine Kamera gefunden.'); setLoading(false); return }
        setCameras(devices)
        const back = devices.find(d => /back|rear|environment/i.test(d.label))
        cameraId = back ? back.id : devices[0].id
        setActiveCamId(cameraId)
      }

      const scanner = new Html5Qrcode('qr-reader-container')
      instanceRef.current = scanner

      await scanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 90 },
          aspectRatio: 1.7778,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        },
        async (decodedText) => {
          if (detectedRef.current) return   // nur einmal scannen
          detectedRef.current = true
          if (navigator.vibrate) navigator.vibrate(100)

          // Scanner pausieren während Lookup
          instanceRef.current?.pause(true)
          setLooking(true)

          const productData = await lookupBarcode(decodedText)

          setLooking(false)
          onDetected(decodedText, productData)
        },
        () => {}
      )

      // html5-qrcode doppeltes Canvas verstecken
      setTimeout(() => {
        const canvas = document.querySelector('#qr-reader-container canvas')
        if (canvas) canvas.style.display = 'none'
      }, 300)

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
    setActiveCamId(camId)
    setLoading(true)
    startScanner(camId)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50 fade-enter" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl pointer-events-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900">Barcode scannen</h3>
              <p className="text-xs text-gray-400">EAN-13 / EAN-8 / Code128</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Kamera-Auswahl */}
          {cameras.length > 1 && (
            <div className="px-4 pt-2 flex gap-2 flex-wrap">
              {cameras.map((cam, i) => (
                <button key={cam.id} onClick={() => switchCamera(cam.id)}
                  className={`text-xs rounded-full px-3 py-1 font-medium transition-colors ${
                    activeCamId === cam.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {cam.label || `Kamera ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Kamerabild */}
          <div className="relative bg-black" style={{ minHeight: 180 }}>
            {(loading || looking) && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80">
                <div className="text-white text-center px-6">
                  <svg className="w-8 h-8 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <p className="text-sm font-medium">
                    {looking ? 'Produkt wird gesucht…' : 'Kamera wird gestartet…'}
                  </p>
                  {looking && <p className="text-xs text-gray-300 mt-1">Open Food Facts wird abgefragt</p>}
                </div>
              </div>
            )}
            <div id="qr-reader-container" className="w-full" />
          </div>

          {/* Hinweis / Fehler */}
          <div className="px-4 py-3">
            {error ? (
              <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 mb-3">{error}</div>
            ) : !loading && !looking && (
              <p className="text-xs text-gray-400 text-center mb-3">
                Barcode in den <strong>weißen Rahmen</strong> halten · ca. 10–20 cm Abstand
              </p>
            )}
            <button onClick={onClose} className="btn-secondary w-full">Abbrechen</button>
          </div>
        </div>
      </div>
    </>
  )
}
