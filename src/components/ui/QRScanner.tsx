import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, SwitchCamera } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const containerId = 'qr-scanner-container';

  const startScanner = async (mode: 'environment' | 'user') => {
    try {
      if (scannerRef.current) {
        if (started) {
          await scannerRef.current.stop().catch(() => {});
        }
        await scannerRef.current.start(
          { facingMode: mode },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {}
        );
        setStarted(true);
        setError('');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('permission')) {
        setError('Camera permission denied. Please allow camera access.');
      } else {
        setError('Could not start camera. Please try again.');
      }
    }
  };

  useEffect(() => {
    scannerRef.current = new Html5Qrcode(containerId, {
      verbose: false,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.CODE_128,
      ],
    });
    startScanner('environment');

    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const handleFlip = async () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    await startScanner(newMode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h2 className="text-white font-semibold text-lg">Scan Barcode / QR</h2>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-90"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <div className="relative w-full max-w-sm">
          <div id={containerId} className="rounded-2xl overflow-hidden" />

          {/* Scanning guide overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />
              {/* Scanning line animation */}
              <div className="absolute inset-x-0 h-0.5 bg-brand-400 opacity-70 animate-bounce" style={{ top: '50%' }} />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 w-full max-w-sm">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        <p className="text-surface-400 text-sm text-center">
          Point the camera at a barcode or QR code
        </p>
      </div>

      {/* Controls */}
      <div className="p-6 flex items-center justify-center gap-4">
        <button
          onClick={handleFlip}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium
                     px-5 py-3 rounded-xl transition-all duration-200 active:scale-95"
        >
          <SwitchCamera className="w-5 h-5" />
          Flip Camera
        </button>
      </div>
    </div>
  );
}
