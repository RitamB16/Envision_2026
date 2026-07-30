import { useState, useEffect, ClipboardEvent, KeyboardEvent } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api, RAZORPAY_UPI_ID, FEST_UPI_ID, FEST_UPI_NAME } from '../utils/api';
import { enqueueOfflineItem } from '../utils/offlineQueue';
import { useRegistrationContext } from '../context/RegistrationContext';
import { formatISTTimestamp } from '../utils/timeUtils';

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
    const hasParamsState = !!(params.registrationId && params.registrationId !== 'REG-PENDING');
    const hasLocationState = !!(stateData.registrationId || stateData.razorpayOrderId || stateData.razorpay_order_id);
    const hasPropsState = !!(props.registrationId && props.registrationId !== 'REG-PENDING');
    const hasContextState = !!(regContextState.registrationId || regContextState.razorpayOrderId);

    if (!hasParamsState && !hasLocationState && !hasPropsState && !hasContextState) {
      console.warn("Direct URL navigation to /checkout detected without active registration session. Redirecting to /events.");
      navigate('/events', { replace: true });
    }
  }, [params.registrationId, stateData, props.registrationId, regContextState, navigate]);

  const registrationId = props.registrationId || params.registrationId || stateData.registrationId || regContextState.registrationId || 'REG-PENDING';
  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);
  const [fetchedEventName, setFetchedEventName] = useState<string | null>(null);
  const [fetchedUserName, setFetchedUserName] = useState<string | null>(null);
  const [fetchedFestId, setFetchedFestId] = useState<string | null>(null);

  const eventName = fetchedEventName || props.eventName || stateData.eventName || regContextState.eventName || 'ENVISION FEST EVENT';

  useEffect(() => {
    async function fetchDatabaseDetails() {
      if (registrationId && registrationId !== 'REG-PENDING') {
        try {
          const regRes = await api.get<any>(`/payments/registration/${registrationId}`);
          if (regRes) {
            if (regRes.amount) setFetchedPrice(regRes.amount);
            if (regRes.event_name) setFetchedEventName(regRes.event_name);
            if (regRes.participant_name) setFetchedUserName(regRes.participant_name);
            if (regRes.fest_id) setFetchedFestId(regRes.fest_id);
            return;
          }
        } catch (err) {
          console.warn("Could not fetch registration details via GET endpoint:", err);
        }
      }

      try {
        const events = await api.get<any[]>('/events');
        if (Array.isArray(events) && events.length > 0) {
          const match = events.find((e: any) =>
            e.name.toLowerCase() === eventName.toLowerCase() ||
            e.id.toLowerCase() === (stateData.eventId || '').toLowerCase()
          );
          if (match && match.price_amount) {
            setFetchedPrice(match.price_amount);
            if (match.name) setFetchedEventName(match.name);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch price from events database endpoint:", err);
      }

      if (registrationId && registrationId !== 'REG-PENDING') {
        try {
          const res = await api.post<any>('/payments/create-order', { registration_id: registrationId });
          if (res && res.amount) {
            setFetchedPrice(res.amount);
            if (res.event_name) setFetchedEventName(res.event_name);
          }
        } catch (err) {
          console.warn("Could not fetch order price dynamically:", err);
        }
      }
    }

    fetchDatabaseDetails();
  }, [registrationId, eventName, stateData.eventId]);

  const CANONICAL_PRICES: Record<string, number> = {
    'carlsen-chess': 49,
    'syntaxx': 39,
    'bidquest': 149,
    'mindspark': 49,
    'lensverse': 49,
    'techtalk': 0
  };

  const getCanonicalEventId = (name: string): string => {
    const clean = (name || '').toLowerCase().replace(/-/g, ' ').trim();
    if (clean.includes('chess') || clean.includes('carlsen')) return 'carlsen-chess';
    if (clean.includes('syntax') || clean.includes('coding')) return 'syntaxx';
    if (clean.includes('bid') || clean.includes('auction')) return 'bidquest';
    if (clean.includes('quiz') || clean.includes('mindspark')) return 'mindspark';
    if (clean.includes('lens') || clean.includes('photo')) return 'lensverse';
    return 'carlsen-chess';
  };

  const canonicalId = getCanonicalEventId(eventName || stateData.eventName || '');
  const initialFallbackFee = CANONICAL_PRICES[canonicalId] ?? 49;

  const rawFee = (fetchedPrice !== null && fetchedPrice !== undefined)
    ? fetchedPrice
    : (props.baseFee || stateData.baseFee || stateData.priceAmount || stateData.amount || stateData.price || initialFallbackFee);
  const numericFee = typeof rawFee === 'number' ? rawFee : parseInt(String(rawFee).replace(/\D/g, '')) || initialFallbackFee;
  const totalAmount = numericFee;

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

  const cleanTargetVpa = (FEST_UPI_ID || (import.meta.env as any).VITE_FEST_UPI_ID || RAZORPAY_UPI_ID || 'ritambera6969@oksbi').trim();
  const cleanPayeeName = (FEST_UPI_NAME || (import.meta.env as any).VITE_FEST_UPI_NAME || 'RITAM BERA').trim();
  const cleanAmount = String(totalAmount).trim();
  const rawId = String(registrationId).replace(/^ENV26-REG-/i, '');
  const shortId = rawId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
  const cleanNote = `Reg${shortId || '26'}`;

  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(cleanTargetVpa)}&pn=${encodeURIComponent(cleanPayeeName)}&am=${encodeURIComponent(cleanAmount)}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;
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
    name: fetchedUserName || props.userDetails?.name || stateData.userName || stateData.name || localStorage.getItem('user_name') || 'Fest Participant',
    email: props.userDetails?.email || stateData.userEmail || stateData.email || localStorage.getItem('user_email') || 'techfestenvision@gmail.com',
    phone: realPhone ? (realPhone.startsWith('+') ? realPhone : `+91 ${realPhone}`) : 'Contact Verified',
    festId: fetchedFestId || props.userDetails?.festId || stateData.festId || localStorage.getItem('fest_id') || 'ENV26-001',
  };

  useEffect(() => {
    let timer: any;
    if (paymentStatus === 'SUCCESS') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/events', {
              state: {
                justRegisteredEvent: eventName,
                registrationId,
                totalAmount,
                paymentStatus: 'PENDING_VERIFICATION',
                payment_id: txnId,
              },
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

  const handleUtrChange = (val: string) => {
    const sanitized = val.replace(/\D/g, '').slice(0, 12);
    setUtrInput(sanitized);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasteUtr = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    handleUtrChange(pastedText);
  };

  const handleKeyDownUtr = (e: KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight'
    ) {
      return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleVerifyUTR = async () => {
    const cleanUtr = utrInput.trim();
    if (cleanUtr.length !== 12) {
      setErrorMessage("Please enter exactly 12 numeric digits from your UPI payment receipt.");
      return;
    }

    setPaymentStatus('PROCESSING');
    setErrorMessage(null);

    try {
      await api.post('/payments/submit-utr', {
        registration_id: registrationId,
        utr_number: cleanUtr,
        event_name: eventName,
        user_email: userDetails.email
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
      console.warn("UTR endpoint notice on current mobile network:", err);

      const serverMessage = err?.response?.data?.detail;
      if (err?.response?.status === 400) {
        // Backend validation or Duplicate UTR rejection
        setPaymentStatus('IDLE');
        setErrorMessage(serverMessage || "Invalid UTR format or duplicate UTR submission. Please check your payment receipt.");
        return;
      }

      // Offline Cache & Auto-Sync: Enqueue UTR submission so background worker syncs to PostgreSQL as soon as network connects!
      enqueueOfflineItem('UTR_SUBMIT', '/payments/submit-utr', {
        registration_id: registrationId,
        utr_number: cleanUtr,
        event_name: eventName,
        user_email: userDetails.email
      });

      const submittedTxnId = `UTR-${cleanUtr}`;
      setTxnId(submittedTxnId);
      setPaymentStatus('SUCCESS');

      clearRegistrationData();
      try {
        sessionStorage.removeItem('envision_registration_pipeline_state');
        sessionStorage.removeItem('registrationData');
      } catch (e) {}
    }
  };

  const utrLength = utrInput.trim().length;

  return (
    <div className="min-h-screen bg-[#04010d] text-white flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden font-sans select-none box-border">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-purple-600/15 rounded-full blur-[110px] pointer-events-none" />

      <div className="w-full max-w-lg bg-[#0a051c]/95 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl md:rounded-3xl shadow-[0_0_50px_rgba(0,243,255,0.15)] p-4 sm:p-7 relative z-10 my-4 box-border overflow-hidden mx-auto">
        
        <div className="pb-3 border-b border-white/10 mb-4 text-center">
          <h2 className="text-xs sm:text-sm font-black text-cyan-300 font-mono tracking-widest uppercase m-0">
            PAYMENT CHECKOUT
          </h2>
        </div>

        {paymentStatus === 'SUCCESS' && (
          <div className="py-4 px-2 text-center flex flex-col items-center justify-center animate-fade-in">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.35)]">
                <svg className="w-8 h-8 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-amber-400 font-mono uppercase mb-1">
              PENDING ADMIN VERIFICATION
            </h2>
            <p className="text-gray-300 text-xs max-w-sm mb-4 font-sans leading-relaxed">
              Your 12-digit UTR reference <strong className="text-cyan-300">{txnId}</strong> for <strong className="text-cyan-300">{eventName}</strong> has been logged.
            </p>

            <div className="w-full bg-[#070318] border border-amber-500/30 rounded-xl p-3 sm:p-4 mb-4 text-left font-mono space-y-2 box-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">AUDIT STATUS:</span>
                <span className="text-amber-400 font-extrabold bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 text-[10.5px]">
                  ⏳ PENDING MANUAL BANK AUDIT
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono border-b border-white/5 pb-1">
                <span>SUBMITTED TIME:</span>
                <strong className="text-cyan-300">{formatISTTimestamp()}</strong>
              </div>
              <p className="text-[11px] text-gray-300 font-sans leading-relaxed pt-1 m-0">
                Your registration is currently in <strong>PENDING_VERIFICATION</strong>. Accounts team manually verifies your 12-digit UTR against official bank statements within <strong>2 hours</strong>.
              </p>
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden mt-2">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-cyan-400 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                />
              </div>
              <p className="text-[10.5px] text-center text-cyan-300 font-mono animate-pulse m-0 pt-1">
                Redirecting to tracks page in <strong className="text-white">{countdown}</strong>s...
              </p>
            </div>

            <button
              onClick={() => navigate('/events', { state: { justRegisteredEvent: eventName, registrationId, payment_id: txnId } })}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-400 text-black font-black uppercase font-mono text-xs sm:text-sm tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:scale-[1.01] transition-transform cursor-pointer"
            >
              RETURN TO TRACKS PAGE &rarr;
            </button>
          </div>
        )}

        {paymentStatus !== 'SUCCESS' && (
          <div className="space-y-4">
            {paymentStatus === 'FAILED' && errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono flex items-start gap-2.5 animate-shake">
                <span className="text-base flex-shrink-0">⚠️</span>
                <div className="flex-1">
                  <strong className="block text-red-400 font-bold text-xs mb-0.5">Verification Error</strong>
                  <p className="text-gray-300 text-[11.5px] leading-snug">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="bg-[#070318]/90 border border-cyan-500/30 rounded-xl p-4 sm:p-5 space-y-3 box-border">
              <div className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="min-w-0 flex-1 text-left">
                  <span className="text-[10px] font-mono text-cyan-400 tracking-wider font-extrabold uppercase block mb-0.5">
                    EVENT TRACK
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white font-mono uppercase truncate m-0">
                    {eventName}
                  </h2>
                </div>
                <div className="text-right shrink-0 bg-cyan-500/15 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-cyan-500/40 shadow-sm">
                  <span className="text-[9px] font-mono text-gray-400 uppercase block leading-none mb-1">FEE DUE</span>
                  <span className="text-lg sm:text-xl font-black text-cyan-300 font-mono tracking-tight leading-none">₹{totalAmount}</span>
                </div>
              </div>

              <div className="flex flex-row items-center justify-between text-xs font-mono text-gray-300 pt-1 gap-2">
                <div className="truncate text-left">
                  <span className="text-gray-400 text-[10px] uppercase">PARTICIPANT: </span>
                  <strong className="text-white">{userDetails.name}</strong>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-gray-400 text-[10px] uppercase">FEST ID: </span>
                  <strong className="text-cyan-300">{userDetails.festId}</strong>
                </div>
              </div>
            </div>

            <div className="bg-[#060214] border border-cyan-500/30 rounded-xl p-4 sm:p-5 space-y-3 box-border">
              <div className="text-center sm:text-left">
                <h3 className="text-xs font-mono text-cyan-300 font-extrabold uppercase tracking-wider m-0 flex items-center justify-center sm:justify-start gap-1.5">
                  <span>📱</span> SCAN QR CODE OR COPY UPI ID
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0a051d] p-3.5 sm:p-4 rounded-xl border border-cyan-500/20 box-border">
                <img
                  src={qrCodeUrl}
                  alt="UPI QR Code"
                  className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl bg-white/5 p-1.5 object-contain shrink-0 border border-cyan-400/40 shadow-[0_0_20px_rgba(0,243,255,0.2)]"
                />
                <div className="flex-1 min-w-0 text-center sm:text-left space-y-2.5 w-full">
                  <span className="text-[11px] text-gray-400 font-mono block">
                    Official Fest Receiver VPA:
                  </span>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs sm:text-sm font-mono font-extrabold text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 px-3 py-2 rounded-lg truncate select-all">
                      {cleanTargetVpa}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUPI}
                      className="px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer shrink-0 active:scale-95"
                    >
                      {copied ? '✓ COPIED!' : 'COPY VPA'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#060214] border-2 border-cyan-500/40 hover:border-cyan-400/70 rounded-2xl p-4 sm:p-6 space-y-4 box-border shadow-[0_0_30px_rgba(0,243,255,0.15)] transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-purple-500/20">
                <label className="text-sm sm:text-base font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300 uppercase tracking-wider flex items-center gap-2 drop-shadow-[0_0_10px_rgba(0,243,255,0.4)]">
                  <span className="text-lg animate-pulse">🔑</span> ENTER 12-DIGIT UPI UTR / REF NO.
                </label>
                <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-full border ${utrLength === 12 ? 'text-emerald-300 bg-emerald-950/60 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'text-amber-300 bg-amber-950/60 border-amber-500/50'}`}>
                  {utrLength === 12 ? '✓ 12/12 VALID UTR' : `${utrLength} / 12 digits`}
                </span>
              </div>

              <div className="space-y-2.5">
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
                  className="w-full bg-[#0a051d] border-2 border-purple-500/50 focus:border-cyan-400 disabled:opacity-50 rounded-xl p-3.5 sm:p-4 text-cyan-200 font-mono text-base sm:text-lg font-bold tracking-widest placeholder:text-gray-600 outline-none transition-all box-border text-center shadow-[inset_0_0_12px_rgba(0,0,0,0.6)]"
                />
                
                <p className="text-xs font-mono leading-relaxed m-0 text-center">
                  {utrLength === 12 ? (
                    <span className="text-emerald-400 font-bold">
                      ✓ UTR Ready! Click the button below to submit for instant verification.
                    </span>
                  ) : utrLength > 0 ? (
                    <span className="text-amber-300 font-semibold">
                      ⚠️ Enter all 12 digits from your UPI payment receipt ({12 - utrLength} digits remaining).
                    </span>
                  ) : (
                    <span className="text-gray-300 font-medium">
                      Found on your PhonePe / GooglePay / Paytm receipt as 12-digit UTR / RRN / Ref No.
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={handleVerifyUTR}
                disabled={paymentStatus === 'PROCESSING' || utrLength !== 12}
                className="w-full mt-3 py-4 sm:py-5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-sm sm:text-base uppercase font-mono tracking-widest shadow-[0_0_25px_rgba(168,85,247,0.45)] hover:shadow-[0_0_35px_rgba(0,243,255,0.65)] transition-all transform active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer box-border min-h-[56px]"
              >
                {paymentStatus === 'PROCESSING' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>SUBMITTING UTR...</span>
                  </>
                ) : (
                  <span>SUBMIT UTR FOR VERIFICATION &rarr;</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
