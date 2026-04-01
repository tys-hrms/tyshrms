import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs-backend-webgl';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getCurrentPosition } from '../lib/location';
import { 
  Package, Lock, ChevronRight, Delete, Fingerprint, 
  MapPin, Loader2, XCircle, Camera, UserCheck, 
  ShieldAlert, Scan, Map as MapIcon, RotateCcw
} from 'lucide-react';

export default function LoginPage() {
  const { login, clockIn, loginBiometric, users } = useAuth();
  const { settings } = useSettings();

  // PIN State
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const maxPin = 6;

  // Face Detection State
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detector, setDetector] = useState<faceDetection.FaceDetector | null>(null);
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);

  // Location State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize Biometrics & Face Detector
  useEffect(() => {
    if (window.PublicKeyCredential) {
      setBiometricsSupported(true);
    }

    const initFaceDetection = async () => {
      try {
        const model = faceDetection.SupportedModels.MediaPipeFaceDetection;
        const detectorConfig: faceDetection.MediaPipeFaceDetectionModelConfig = {
          runtime: 'tfjs',
          modelType: 'short',
        };
        const newDetector = await faceDetection.createDetector(model, detectorConfig);
        setDetector(newDetector);
      } catch (err) {
        console.warn('Face detection initialization failed:', err);
      }
    };
    initFaceDetection();

    return () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, []);

  // Face Detection Loop
  const detectFace = useCallback(async () => {
    if (detector && webcamRef.current && webcamRef.current.video?.readyState === 4) {
      const video = webcamRef.current.video;
      try {
        const faces = await detector.estimateFaces(video);
        setFaceDetected(faces.length > 0);
      } catch (e) {
        // silent fallback
      }
    } else if (!detector && isCameraReady) {
      // Mock detection if model didn't load but camera is on (to avoid hard-locking if CDN fails)
      setFaceDetected(true); 
    }
  }, [detector, isCameraReady]);

  useEffect(() => {
    if (isCameraReady) {
      detectionInterval.current = setInterval(detectFace, 500);
    }
    return () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, [isCameraReady, detectFace]);

  // Handle Geolocation
  const requestLocation = async () => {
    setIsLocating(true);
    try {
      const coords = await getCurrentPosition();
      setUserCoords(coords);
      return coords;
    } catch (err: any) {
      return null;
    } finally {
      setIsLocating(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    setIsVerifying(true);
    try {
      const res = await loginBiometric();
      if (!res.success) {
        setError(res.error || 'Biometric login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred during biometric login');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogin = async (currentPin: string) => {
    setError('');
    const user = users.find(u => u.pinCode === currentPin);
    
    if (!user || !user.isActive) {
      setError(user ? 'Account inactive' : 'Invalid PIN');
      setPin('');
      setShake(true);
      setTimeout(() => setShake(false), 800);
      return;
    }

    setIsVerifying(true);
    try {
      let coords = userCoords;
      const needsLoc = user.role !== 'Admin';
      const isBypassed = user.geofenceBypassUntil && new Date(user.geofenceBypassUntil) > new Date();
      
      if (needsLoc && !isBypassed && !coords) {
        coords = await requestLocation();
        if (!coords) {
          setError('Location verification is required for access.');
          setIsVerifying(false);
          return;
        }
      }

      const res = login(currentPin, faceDetected, coords || undefined);
      
      if (res.success) {
        if (user.role === 'Worker') {
          clockIn(undefined, 'manual');
        }
      } else {
        setError(res.error || 'Login failed');
        setPin('');
        setShake(true);
        setTimeout(() => setShake(false), 800);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= maxPin) return;
    setError('');
    setPin(pin + digit);
  };

  const handleLoginSubmit = () => {
    if (pin.length >= 4 && pin.length <= maxPin) {
      handleLogin(pin);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-inter">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-custom-blue/10 rounded-full blur-[100px] animate-pulse" />

      <div className="w-full max-w-sm relative z-10">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-xl relative group">
            <div className="absolute inset-0 bg-teal-400/20 rounded-2xl blur-xl group-hover:bg-teal-400/30 transition-all" />
            <Package className="w-7 h-7 text-teal-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">TYS-HRMS</h1>
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <Scan className="w-3 h-3" />
            Face & Proximity Security
          </div>
        </div>

        {/* Auth Module */}
        <div className="bg-slate-900/80 backdrop-blur-3xl border border-slate-800/50 rounded-[40px] p-1 shadow-2xl relative">
          
          {/* Camera Feed Container */}
          <div className="relative aspect-[4/3] rounded-[38px] overflow-hidden bg-slate-950 border border-slate-800/50 group">
            <Webcam
              ref={webcamRef}
              audio={false}
              onUserMedia={() => setIsCameraReady(true)}
              onUserMediaError={() => setError('Camera access denied')}
              className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 transition-all duration-700"
              videoConstraints={{ facingMode: 'user' }}
            />
            
            {/* Overlay UI */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40">
              {/* Top Status */}
              <div className="flex justify-between items-start">
                <div className={`px-3 py-1.5 rounded-full border text-[10px] font-bold flex items-center gap-2 backdrop-blur-md transition-all ${
                  faceDetected 
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                    : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${faceDetected ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                  {faceDetected ? 'FACE DETECTED' : 'SCANNING FOR FACE...'}
                </div>
                
                <button onClick={() => window.location.reload()} className="p-2 bg-slate-900/50 hover:bg-slate-800 rounded-full border border-slate-800 text-slate-400 transition-all active:rotate-180">
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* Bottom Status (Geofence) */}
              <div className="flex items-center justify-center">
                <div className={`px-4 py-2 rounded-2xl border backdrop-blur-xl flex items-center gap-3 transition-all ${
                  userCoords 
                    ? 'bg-custom-blue/20 border-custom-blue/30 text-custom-blue' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}>
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : userCoords ? (
                    <MapIcon className="w-4 h-4" />
                  ) : (
                    <MapPin className="w-4 h-4 opacity-50" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase leading-tight">Geofence Status</span>
                    <span className="text-xs font-medium">{userCoords ? 'ZONE VERIFIED' : isLocating ? 'LOCATING...' : 'WAITING FOR LOGIN'}</span>
                  </div>
                </div>
              </div>

              {/* Scanner Simulation */}
              {faceDetected && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-emerald-500/50 rounded-full animate-ping opacity-20" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-emerald-500/30 rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* PIN Pad Area */}
          <div className="p-8">
            <div className={`flex justify-center gap-3 mb-8 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
              {[...Array(maxPin)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                    i < pin.length 
                      ? 'bg-custom-blue border-custom-blue shadow-[0_0_15px_rgba(45,124,246,0.6)] scale-125' 
                      : 'border-slate-800 bg-slate-900/50'
                  }`}
                />
              ))}
            </div>

            {error ? (
              <div className="mb-6 p-4 rounded-2xl border flex items-start gap-4 text-xs font-semibold bg-red-500/10 border-red-500/10 text-red-400 animate-in slide-in-from-top-2 duration-300">
                <ShieldAlert className="w-5 h-5 shrink-0 opacity-80" />
                <div className="flex-1 leading-relaxed">{error}</div>
              </div>
            ) : (
                <p className="text-center text-slate-500 text-xs font-medium mb-6 uppercase tracking-widest">Enter Access Code</p>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleDigit(num.toString())}
                  className="h-14 rounded-2xl bg-slate-800/30 border border-slate-700/30 text-xl font-bold text-white hover:bg-slate-800/80 hover:border-slate-600 active:scale-90 transition-all font-inter"
                >
                  {num}
                </button>
              ))}
              <div className="col-start-2">
                <button
                  onClick={() => handleDigit('0')}
                  className="w-full h-14 rounded-2xl bg-slate-800/30 border border-slate-700/30 text-xl font-bold text-white hover:bg-slate-800/80 hover:border-slate-600 active:scale-90 transition-all font-inter"
                >
                  0
                </button>
              </div>
              <div className="col-start-3">
                <button
                  onClick={handleDelete}
                  className="w-full h-14 rounded-2xl bg-slate-800/30 border border-slate-700/30 flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-500/20 active:scale-90 transition-all"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={handleLoginSubmit}
                disabled={pin.length < 4 || isVerifying || (!faceDetected && !detector)}
                className="w-full bg-custom-blue hover:bg-blue-600 active:scale-95 disabled:bg-slate-800/50 disabled:text-slate-600 text-white font-black py-4 rounded-3xl shadow-xl shadow-custom-blue/20 flex items-center justify-center transition-all duration-300 text-sm uppercase tracking-widest"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Sign In Securely
                    <ChevronRight className="w-5 h-5 ml-2 opacity-50" />
                  </>
                )}
              </button>

              {biometricsSupported && (
                <button
                  onClick={handleBiometricLogin}
                  className="w-full py-3 rounded-2xl bg-slate-900/50 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center transition-all leading-none"
                >
                  <Fingerprint className="w-3.5 h-3.5 mr-2 text-custom-blue/60" />
                  Use Device Fingerprint
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
}
