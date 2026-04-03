import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs-backend-webgl';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  Building2, 
  Search, 
  User as UserIcon, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Delete, 
  Camera, 
  Scan,
  XCircle,
  Loader2,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { discoverTenant, loginAdmin, loginStaff, session, logout } = useAuth();
  const { settings } = useSettings();

  // Navigation State
  const [phase, setPhase] = useState<'discovery' | 'auth'>('discovery');
  const [loginMode, setLoginMode] = useState<'staff' | 'admin'>('staff');

  // Discovery State
  const [orgId, setOrgId] = useState('');
  const [discoveryError, setDiscoveryError] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Auth State
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Face Detection State (for Staff)
  const webcamRef = useRef<Webcam>(null);
  const [detector, setDetector] = useState<faceDetection.FaceDetector | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);

  // Connection Status (Simulated based on context)
  const isConnected = settings.mongodb.isEnabled;

  // Initialize Detector
  useEffect(() => {
    const initFaceDetection = async () => {
      try {
        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        const detectorConfig: faceDetection.MediaPipeFaceDetectorTfjsModelConfig = {
          runtime: 'tfjs', modelType: 'short',
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

  const detectFace = useCallback(async () => {
    if (detector && webcamRef.current?.video?.readyState === 4) {
      try {
        const faces = await detector.estimateFaces(webcamRef.current.video);
        setFaceDetected(faces.length > 0);
      } catch (e) { /* ignore */ }
    }
  }, [detector]);

  useEffect(() => {
    if (isCameraReady && loginMode === 'staff') {
      detectionInterval.current = setInterval(detectFace, 500);
    } else {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    }
    return () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, [isCameraReady, detectFace, loginMode]);

  // Actions
  const handleDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiscoveryError('');
    if (!/^\d{6}$|^\d{2}-\d{4}$/.test(orgId)) {
      setDiscoveryError('Organization ID must be 6 digits (e.g. 26-4533)');
      return;
    }

    setIsDiscovering(true);
    try {
      const res = await discoverTenant(orgId);
      if (res.success) {
        setPhase('auth');
      } else {
        setDiscoveryError(res.error || 'Organization not found');
      }
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !pin) {
      setAuthError('Email and PIN are required');
      return;
    }

    setIsAuthenticating(true);
    try {
      const res = await loginAdmin(email, pin);
      if (res.success) {
        navigate('/');
      } else {
        setAuthError(res.error || 'Authentication failed');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleStaffPin = (digit: string) => {
    if (pin.length >= 6) return;
    setPin(prev => prev + digit);
  };

  const handleStaffLogin = async () => {
    setAuthError('');
    if (!faceDetected) {
      setAuthError('Face recognition required for Staff login.');
      return;
    }
    if (pin.length < 4) {
      setAuthError('Please enter your 4-6 digit access PIN.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const res = await loginStaff(pin, faceDetected);
      if (res.success) {
        navigate('/');
      } else {
        setAuthError(res.error || 'Invalid PIN or Access Denied');
        setPin('');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const resetDiscovery = () => {
    logout();
    setPhase('discovery');
    setOrgId('');
    setPin('');
    setEmail('');
  };

  // UI Reusable Components
  const PinPad = () => (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => handleStaffPin(n.toString())}
          className="h-14 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xl transition-colors border border-slate-700"
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setPin('')}
        className="h-14 bg-slate-900 text-slate-500 font-bold border border-slate-800"
      >
        CLR
      </button>
      <button
        type="button"
        onClick={() => handleStaffPin('0')}
        className="h-14 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xl border border-slate-700"
      >
        0
      </button>
      <button
        type="button"
        onClick={() => setPin(p => p.slice(0, -1))}
        className="h-14 bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800"
      >
        <Delete className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-inter">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 relative shadow-2xl">
          
          {/* Header */}
          <div className="p-8 border-b border-slate-800 text-center">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">HRMSCore</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-1 font-bold">Workforce Management System</p>
          </div>

          <div className="p-8">
            {phase === 'discovery' ? (
              /* PHASE 1: DISCOVERY */
              <form onSubmit={handleDiscovery} className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-white font-bold text-lg">Identify Organization</h2>
                  <p className="text-slate-500 text-xs mt-1">Enter your unique 6-digit organization code</p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      value={orgId}
                      onChange={e => setOrgId(e.target.value.replace(/[^\d-]/g, '').slice(0, 7))}
                      placeholder="Organization ID"
                      className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 text-center text-2xl font-mono font-black text-brand-400 tracking-[0.3em] focus:border-brand-500 outline-none transition-colors"
                      inputMode="numeric"
                      autoFocus
                    />
                  </div>

                  {discoveryError && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-xs font-bold text-center">
                      {discoveryError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isDiscovering || orgId.length < 6}
                    className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold uppercase tracking-widest transition-all"
                  >
                    {isDiscovering ? 'Searching...' : 'Continue'}
                  </button>

                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      className="text-xs text-slate-500 hover:text-brand-400 font-bold uppercase tracking-widest"
                    >
                      New Organization? Register Now
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* PHASE 2: AUTHENTICATION */
              <div className="space-y-6">
                {/* Organization Context */}
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm uppercase leading-none">{session.tenant?.name}</h3>
                      <span className="text-[10px] text-slate-500 font-mono tracking-wider">{session.tenant?.id}</span>
                    </div>
                  </div>
                  <button 
                    onClick={resetDiscovery}
                    className="p-2 text-slate-500 hover:text-white"
                    title="Change Organization"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Login Mode Toggle */}
                <div className="grid grid-cols-2 bg-slate-950 p-1 mb-6">
                  <button
                    onClick={() => { setLoginMode('staff'); setPin(''); }}
                    className={`py-3 text-[10px] font-black uppercase tracking-widest transition-all ${loginMode === 'staff' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Staff Portal
                  </button>
                  <button
                    onClick={() => { setLoginMode('admin'); setPin(''); }}
                    className={`py-3 text-[10px] font-black uppercase tracking-widest transition-all ${loginMode === 'admin' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Admin Login
                  </button>
                </div>

                {/* Change Org Context (Moved and made clearer) */}
                <div className="mt-8 pt-4 border-t border-slate-800 text-center">
                   <button 
                    onClick={resetDiscovery}
                    className="flex items-center justify-center gap-2 mx-auto text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-all"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Switch Organization
                  </button>
                </div>

                {authError && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-xs font-bold text-center">
                    {authError}
                  </div>
                )}

                {loginMode === 'admin' ? (
                  /* ADMIN LOGIN */
                  <form onSubmit={handleAdminLogin} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none"
                        placeholder="admin@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Security PIN</label>
                       <div className="relative">
                        <input
                          type={showPin ? 'text' : 'password'}
                          value={pin}
                          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none pr-12 text-center tracking-[0.5em] font-mono"
                          placeholder="••••••"
                          inputMode="numeric"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                       </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold uppercase tracking-widest"
                    >
                      {isAuthenticating ? 'Verifying...' : 'Unlock Dashboard'}
                    </button>
                    
                    <div className="text-center">
                      <button 
                        type="button"
                        onClick={() => alert('Please contact the System Admin to reset your Security PIN.')}
                        className="text-[10px] text-slate-500 hover:text-brand-400 font-bold uppercase tracking-widest"
                      >
                        Forgot Access PIN?
                      </button>
                    </div>
                  </form>
                ) : (
                  /* STAFF LOGIN */
                  <div className="space-y-6">
                    {/* Camera */}
                    <div className="relative aspect-video bg-black border border-slate-800 overflow-hidden group">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        onUserMedia={() => setIsCameraReady(true)}
                        className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 transition-all duration-700"
                        videoConstraints={{ facingMode: 'user' }}
                      />
                      <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-slate-900/60 to-transparent">
                          <div className={`self-start px-2 py-1 text-[8px] font-black uppercase tracking-widest flex items-center gap-2 border ${faceDetected ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-950/80 border-slate-800 text-slate-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${faceDetected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                            {faceDetected ? 'FACE DETECTED' : 'AWAITING FACE'}
                          </div>
                      </div>
                      
                      {/* Scanning Line Effect */}
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-400/50 blur-[1px] animate-[scan_2s_linear_infinite]" />
                    </div>

                    {/* PIN Display */}
                    <div className="flex justify-center gap-3">
                      {[...Array(6)].map((_, i) => (
                        <div 
                          key={i}
                          className={`w-3.5 h-3.5 border-2 transition-all duration-300 ${
                            i < pin.length 
                              ? 'bg-brand-400 border-brand-400 shadow-[0_0_10px_rgba(45,124,246,0.6)]' 
                              : 'border-slate-800 bg-slate-950'
                          }`}
                        />
                      ))}
                    </div>

                    <PinPad />

                    <button
                      onClick={handleStaffLogin}
                      disabled={isAuthenticating || pin.length < 4}
                      className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black uppercase tracking-widest flex items-center justify-center gap-3"
                    >
                      {isAuthenticating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Validating IDENTITY...
                        </>
                      ) : (
                        <>
                          Confirm PIN & Clock In
                          <ShieldCheck className="w-5 h-5" />
                        </>
                      )}
                    </button>
                    
                    <div className="text-center">
                      <button 
                        type="button"
                        onClick={() => alert('Please contact your Branch Manager or Administrator to reset your Staff PIN.')}
                        className="text-[10px] text-slate-500 hover:text-brand-400 font-bold uppercase tracking-widest"
                      >
                        Forgot Staff PIN?
                      </button>
                    </div>
                    
                    <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">
                      Biometric-first authentication enabled
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Connection Indicator - 3pt Bold Line */}
          <div 
            className={`h-[3px] w-full transition-colors duration-500 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
            title={isConnected ? 'Cloud Protocol Active' : 'Offline Mode Only'}
          />
        </div>
      </div>

      <div className="py-6 flex flex-col items-center opacity-40">
        <p className="text-[9px] text-slate-500 uppercase tracking-[0.4em] font-black">
          HRMSCore SaaS Portal v2.0
        </p>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(180px); }
        }
      `}</style>
    </div>
  );
}
