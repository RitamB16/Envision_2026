import { useState, useEffect, ClipboardEvent, KeyboardEvent } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api, RAZORPAY_UPI_ID } from '../utils/api';
import { useRegistrationContext } from '../context/RegistrationContext';

export type PaymentStatus = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface PaymentCheckoutProps {
  registrationId?: string;
  eventName?: string;
  registrationType?: string;
  baseFee?: number | string;
  userDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    festId?: string;
  };
}

export default function PaymentCheckout(props: PaymentCheckoutProps) {
  const navigate = useNavigate();
  const params = useParams<{ registrationId?: string }>();
  const location = useLocation();
  const stateData = (location.state as any) || {};
  const { state: regContextState, clearRegistrationData } = useRegistrationContext();

  // Route Guard: Direct manual URL navigation check
  useEffect(() => {
    const hasLocationState = !!(stateData.registrationId || stateData.razorpayOrderId || stateData.razorpay_order_id);
    const hasPropsState = !!(props.registrationId && props.registrationId !== 'REG-PENDING');
    const hasContextState = !!(regContextState.registrationId || regContextState.razorpayOrderId);

    if (!hasLocationState && !hasPropsState && !hasContextState) {
      console.warn("Direct URL navigation to /checkout detected without active registration session. Redirecting to /events.");
      navigate('/events', { replace: true });
    }
  }, [stateData, props.registrationId, regContextState, navigate]);

  const registrationId = props.registrationId || params.registrationId || stateData.registrationId || regContextState.registrationId || 'REG-PENDING';
  const eventName = props.eventName || stateData.eventName || regContextState.eventName || 'ENVISION FEST EVENT';
  const registrationType = props.registrationType || stateData.registrationType || (regContextState.teamName ? 'Team' : 'Individual');
  const baseFee = props.baseFee || stateData.baseFee || regContextState.amount || 39;

  // Dynamic participant contact phone lookup
  const [realPhone, setRealPhone] = useState<string>(
    props.userDetails?.phone ||
    stateData.phone ||
    stateData.userPhone ||
    localStorage.getItem('user_phone') ||
    ''
  );

  const [utrInput, setUtrInput] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('IDLE');
  const [txnId, setTxnId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);

  const numericFee = typeof baseFee === 'number' ? baseFee : parseInt(String(baseFee).replace(/\D/g, '')) || 39;
  const totalAmount = numericFee;

  // Sanitized NPCI-compliant UPI parameters
  const cleanTargetVpa = (RAZORPAY_UPI_ID || '8336048128@ybl').trim();
  const cleanPayeeName = "Envision TechFest";
  const cleanAmount = String(totalAmount).trim();
  const cleanNote = `Reg_${String(registrationId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}`;

  // Construct strictly encoded NPCI-compliant UPI Deep Link Intent
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(cleanTargetVpa)}&pn=${encodeURIComponent(cleanPayeeName)}&am=${encodeURIComponent(cleanAmount)}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;

  // Construct High-Resolution QR Code Image URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiDeepLink)}&color=00f3ff&bgcolor=0a051d`;

  useEffect(() => {
    if (!realPhone) {
      api.get<any>('/users/me')
        .then(u => {
          if (u && u.phone) {
            setRealPhone(u.phone);
            localStorage.setItem('user_phone', u.phone);
          }
        })
        .catch(() => {});
    }
  }, []);

  const userDetails = {
    name: props.userDetails?.name || stateData.userName || stateData.name || localStorage.getItem('user_name') || 'Fest Participant',
    email: props.userDetails?.email || stateData.userEmail || stateData.email || localStorage.getItem('user_email') || 'student@rkmrc.org',
    phone: realPhone ? (realPhone.startsWith('+') ? realPhone : `+91 ${realPhone}`) : 'Contact Verified',
    festId: props.userDetails?.festId || stateData.festId || localStorage.getItem('fest_id') || 'ENV-2026-001',
  };

  // 3-Second Delayed Redirect Countdown on Payment Verification
  useEffect(() => {
    let timer: any;
    if (paymentStatus === 'SUCCESS') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/profile', {
              state: {
                justRegisteredEvent: eventName,
                registrationId,
                totalAmount,
                paymentStatus: 'COMPLETED',
                payment_id: txnId,
                txnId
              }
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [paymentStatus, registrationId, eventName, totalAmount, txnId, navigate]);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(cleanTargetVpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Strict Input Sanitizers & Event Blockers
  const handleUtrChange = (val: string) => {
    const sanitized = val.replace(/\D/g, '').slice(0, 12);
    setUtrInput(sanitized);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasteUtr = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const sanitized = pastedText.replace(/\D/g, '').slice(0, 12);
    setUtrInput(sanitized);
    if (errorMessage) setErrorMessage(null);
  };

  const handleKeyDownUtr = (e: KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation, delete, backspace, tab, enter, select-all keys
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
    if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
      return;
    }
    // Block non-digit keypresses immediately
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Direct 12-Digit UTR Verification Handler with Submission Locking
  const handleVerifyUTR = async () => {
    const cleanUtr = utrInput.trim();

    if (!/^\d{12}$/.test(cleanUtr)) {
      setErrorMessage("Invalid UTR format. Please enter a valid 12-digit numeric UPI UTR / Ref Number from your payment receipt (e.g., 420185938210).");
      return;
    }

    setPaymentStatus('PROCESSING');
    setErrorMessage(null);

    try {
      // Primary verification call
      await api.post('/payments/verify-upi', {
        registration_id: registrationId,
        utr_number: cleanUtr
      }).catch(async () => {
        // Fallback submit route
        return await api.post('/payments/submit-utr', {
          registration_id: registrationId,
          utr_number: cleanUtr
        });
      });

      const submittedTxnId = `UTR-${cleanUtr}`;
      setTxnId(submittedTxnId);
      setPaymentStatus('SUCCESS');

      clearRegistrationData();
      try {
        sessionStorage.removeItem('envision_registration_pipeline_state');
        sessionStorage.removeItem('registrationData');
      } catch (e) {}

    } catch (err: any) {
      console.error("UTR Verification Error:", err);
      setPaymentStatus('FAILED');
      setErrorMessage(err.message || "Failed to verify UTR reference. Please check the 12 digits and try again.");
    }
  };

  const utrLength = utrInput.trim().length;

  return (
    <div className="min-h-screen bg-[#04010d] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none box-border">
      {/* Cyberpunk Glow Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-purple-600/15 rounded-full blur-[110px] pointer-events-none" />

      {/* Main Container with Mobile Margin/Gap */}
      <div className="w-[calc(100%-1rem)] max-w-xl bg-[#0a051c]/95 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl md:rounded-3xl shadow-[0_0_50px_rgba(0,243,255,0.15)] p-4 sm:p-7 relative z-10 my-4 box-border overflow-x-hidden mx-auto">
        
        {/* Navigation / Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <span className="text-[11px] font-mono text-cyan-400 font-extrabold uppercase tracking-wider">
            DIRECT UPI CHECKOUT NODE
          </span>

          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SECURE AUDIT VERIFIED
          </span>
        </div>

        {/* ================= PENDING VERIFICATION STATE ================= */}
        {paymentStatus === 'SUCCESS' && (
          <div className="py-6 px-2 text-center flex flex-col items-center justify-center animate-fade-in">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.35)]">
                <svg className="w-10 h-10 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-amber-400 font-mono uppercase mb-1">
              PENDING ADMIN VERIFICATION
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm max-w-sm mb-4 font-sans leading-relaxed">
              Your 12-digit UTR reference <strong className="text-cyan-300">{txnId}</strong> for <strong className="text-cyan-300">{eventName}</strong> has been logged.
            </p>

            {/* Manual Bank Verification Explanation Card */}
            <div className="w-full bg-[#070318] border border-amber-500/30 rounded-xl p-3.5 mb-5 text-left font-mono space-y-2 box-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">AUDIT STATUS:</span>
                <span className="text-amber-400 font-extrabold bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 text-[10.5px]">
                  ⏳ PENDING MANUAL BANK AUDIT
                </span>
              </div>
              <p className="text-[11px] text-gray-300 font-sans leading-relaxed border-t border-white/10 pt-2 m-0">
                Your registration is currently in <strong>PENDING_VERIFICATION</strong>. Our accounts team manually verifies your 12-digit UTR against official bank statements within <strong>2 hours</strong> before granting final approval.
              </p>
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden mt-2">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-cyan-400 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                />
              </div>
              <p className="text-[10.5px] text-center text-cyan-300 font-mono animate-pulse m-0 pt-1">
                Redirecting to dashboard in <strong className="text-white">{countdown}</strong>s...
              </p>
            </div>

            <button
              onClick={() => navigate('/profile', { state: { justRegisteredEvent: eventName, registrationId, payment_id: txnId } })}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-400 text-black font-black uppercase font-mono text-xs sm:text-sm tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:scale-[1.01] transition-transform cursor-pointer"
            >
              VIEW DASHBOARD (STATUS: PENDING VERIFICATION) &rarr;
            </button>
          </div>
        )}

        {/* ================= MAIN DIRECT UPI UX ================= */}
        {paymentStatus !== 'SUCCESS' && (
          <div className="space-y-4">

            {/* Error Banner */}
            {paymentStatus === 'FAILED' && errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono flex items-start gap-2.5 animate-shake">
                <span className="text-base flex-shrink-0">⚠️</span>
                <div className="flex-1">
                  <strong className="block text-red-400 font-bold text-xs mb-0.5">Verification Error</strong>
                  <p className="text-gray-300 text-[11.5px] leading-snug">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Event Order Summary Card */}
            <div className="bg-[#070318]/90 border border-cyan-500/30 rounded-xl p-3.5 sm:p-4 relative overflow-hidden box-border">
              <div className="flex justify-between items-start mb-3 pb-3 border-b border-white/10 gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono text-cyan-400 tracking-wider font-bold uppercase block">EVENT ORDER</span>
                  <h2 className="text-lg sm:text-2xl font-black text-white font-mono uppercase mt-0.5 truncate">{eventName}</h2>
                  <span className="text-[11px] text-gray-400 font-mono block truncate">
                    {registrationType} Pass &bull; {registrationId}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">FEE</span>
                  <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono tracking-tight">₹{totalAmount}</span>
                </div>
              </div>

              {/* Participant Details Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-300">
                <div className="min-w-0">
                  <span className="text-gray-500 text-[10px] block">NAME</span>
                  <strong className="text-white truncate block">{userDetails.name}</strong>
                </div>
                <div className="min-w-0">
                  <span className="text-gray-500 text-[10px] block">FEST ID</span>
                  <strong className="text-cyan-300 truncate block">{userDetails.festId}</strong>
                </div>
                <div className="col-span-2 pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-mono">
                  <div className="truncate">
                    <span className="text-gray-500 text-[10px]">EMAIL: </span>
                    <span className="text-gray-300">{userDetails.email}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-gray-500 text-[10px]">PHONE: </span>
                    <span className="text-emerald-400 font-bold">{userDetails.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 1: UPI PAYMENT DEEP LINK & QR CODE CARD */}
            <div className="p-4 rounded-xl bg-[#060214] border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <span>📱</span> STEP 1: MAKE UPI PAYMENT (₹{totalAmount})
                </span>
                <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  OFFICIAL FEST VPA
                </span>
              </div>

              {/* MOBILE VIEW: Prominent 1-Tap UPI Intent Link Button */}
              <div className="block md:hidden">
                <a
                  href={upiDeepLink}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-black font-black text-xs sm:text-sm uppercase font-mono tracking-wider shadow-[0_0_25px_rgba(0,243,255,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer no-underline box-border text-center"
                >
                  <span className="text-lg">⚡</span>
                  <span className="truncate">OPEN UPI APP & PAY (GPay / PhonePe / Paytm)</span>
                </a>
              </div>

              {/* DESKTOP / GENERAL VIEW: QR Code & Copyable VPA ID */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0a051d] p-3 rounded-lg border border-cyan-500/20">
                <img
                  src={qrCodeUrl}
                  alt="UPI QR Code"
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg bg-white/5 p-1 object-contain flex-shrink-0 border border-cyan-400/30 shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                />
                <div className="flex-1 min-w-0 text-center sm:text-left space-y-2 w-full">
                  <div className="text-[11px] text-gray-400 font-mono">Scan QR Code or copy VPA ID:</div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs sm:text-sm font-mono font-extrabold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1.5 rounded-md truncate">
                      {cleanTargetVpa}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUPI}
                      className="px-3 py-1.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-[11px] font-mono font-bold transition-colors cursor-pointer shrink-0"
                    >
                      {copied ? '✓ COPIED!' : 'COPY VPA'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono leading-tight">
                    Payee: <strong className="text-gray-200">Envision'26 TechFest</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* STEP 2: SECURE 12-DIGIT UTR INPUT & VERIFICATION */}
            <div className="p-4 rounded-xl bg-[#060214] border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-purple-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔑</span> STEP 2: ENTER 12-DIGIT UPI UTR / REF NO.
                </label>
                <span className={`text-[10.5px] font-mono font-bold ${utrLength === 12 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {utrLength === 12 ? '✓ 12/12 DIGITS VALID' : `${utrLength} / 12 digits`}
                </span>
              </div>

              <div className="space-y-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  value={utrInput}
                  disabled={paymentStatus === 'PROCESSING'}
                  onChange={(e) => handleUtrChange(e.target.value)}
                  onPaste={handlePasteUtr}
                  onKeyDown={handleKeyDownUtr}
                  placeholder="e.g. 420185938210"
                  className="w-full bg-[#0a051d] border border-purple-500/40 focus:border-cyan-400 disabled:opacity-50 rounded-lg p-3 text-cyan-200 font-mono text-sm sm:text-base tracking-widest placeholder:text-gray-600 outline-none transition-colors box-border"
                />
                
                {/* Real-time Inline Helper Validation Feedback */}
                <p className="text-[10.5px] font-mono leading-tight transition-colors">
                  {utrLength === 12 ? (
                    <span className="text-emerald-400 font-bold">
                      ✓ Ready! Click below to verify and unlock your event pass.
                    </span>
                  ) : utrLength > 0 ? (
                    <span className="text-amber-300">
                      ⚠️ Enter all 12 digits from your payment receipt ({12 - utrLength} digits remaining).
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      Found on your UPI receipt as <strong className="text-gray-200">UPI Ref No / UTR / RRN</strong> (12 digits).
                    </span>
                  )}
                </p>
              </div>

              {/* Submit Button with Throttling & Locking */}
              <button
                type="button"
                onClick={handleVerifyUTR}
                disabled={paymentStatus === 'PROCESSING' || utrLength !== 12}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-xs sm:text-sm uppercase font-mono tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all transform active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer box-border"
              >
                {paymentStatus === 'PROCESSING' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>VERIFYING UTR REFERENCE...</span>
                  </>
                ) : (
                  <span>VERIFY & UNLOCK EVENT PASS &rarr;</span>
                )}
              </button>
            </div>

            {/* Portal Footer */}
            <p className="text-[10px] text-center text-gray-500 font-mono">
              Envision'26 TechFest &bull; Official SSL Encrypted Payment Portal
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
