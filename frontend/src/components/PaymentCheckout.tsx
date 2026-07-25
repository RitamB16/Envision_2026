import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api, RAZORPAY_ME_URL, RAZORPAY_UPI_ID } from '../utils/api';
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

  const [showAlternateUpi, setShowAlternateUpi] = useState<boolean>(false);

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

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('IDLE');
  const [txnId, setTxnId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number>(3);

  const numericFee = typeof baseFee === 'number' ? baseFee : parseInt(String(baseFee).replace(/\D/g, '')) || 39;
  const totalAmount = numericFee;

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

  // Load Razorpay SDK script dynamically on mount
  useEffect(() => {
    if (document.getElementById('razorpay-sdk')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // 3-Second Delayed Redirect Countdown on Payment Success
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
    navigator.clipboard.writeText(RAZORPAY_UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [utrInput, setUtrInput] = useState<string>('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState<boolean>(false);

  const handleVerifyUTR = async () => {
    const cleanUtr = utrInput.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      setErrorMessage("Please enter a valid 12-digit UPI UTR / Ref Number from your payment app receipt.");
      return;
    }

    setIsSubmittingUtr(true);
    setErrorMessage(null);

    try {
      await api.post('/payments/submit-utr', {
        registration_id: registrationId,
        utr_number: cleanUtr
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
      setErrorMessage(err.message || "Failed to verify transaction UTR number.");
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  const handlePayNow = async () => {
    setPaymentStatus('PROCESSING');
    setErrorMessage(null);

    try {
      let razorpay_order_id = stateData.razorpayOrderId || stateData.razorpay_order_id;
      let amount = totalAmount * 100;
      let currency = "INR";
      let key_id = (import.meta.env as any).VITE_RAZORPAY_KEY_ID || 'rzp_test_TGuT8hs5QZ9uy9';

      if (!razorpay_order_id) {
        const orderRes = await api.post<any>('/payments/create-order', {
          registration_id: registrationId
        }).catch(err => {
          console.warn("Order creation fallback notice:", err);
          return {
            razorpay_order_id: `order_test_${registrationId.slice(-8)}`,
            amount: totalAmount * 100,
            currency: "INR",
            key_id: "rzp_test_TGuT8hs5QZ9uy9"
          };
        });

        razorpay_order_id = orderRes.razorpay_order_id;
        if (orderRes.amount) amount = orderRes.amount;
        if (orderRes.currency) currency = orderRes.currency;
        if (orderRes.key_id) key_id = orderRes.key_id;
      }

      const razorpayApiKey = (import.meta.env as any).VITE_RAZORPAY_KEY_ID || key_id || 'rzp_test_TGuT8hs5QZ9uy9';

      const options = {
        key: razorpayApiKey,
        amount: amount || totalAmount * 100,
        currency: currency || 'INR',
        name: "Envision'26 TechFest",
        description: `Registration Fee for ${eventName}`,
        order_id: razorpay_order_id,
        config: {
          display: {
            blocks: { upi: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] } },
            sequence: ['block.upi'],
            preferences: { show_default_blocks: false }
          }
        },
        prefill: {
          name: userDetails.name,
          email: userDetails.email,
          contact: userDetails.phone.replace(/\D/g, '')
        },
        theme: {
          color: "#00f3ff",
          backdrop_color: "#060212"
        },
        handler: function (response: any) {
          const paymentId = response.razorpay_payment_id || `pay_${Date.now()}`;
          setTxnId(paymentId);
          setPaymentStatus('SUCCESS');

          clearRegistrationData();
          try {
            sessionStorage.removeItem('envision_registration_pipeline_state');
            sessionStorage.removeItem('registrationData');
          } catch (e) {}

          navigate('/profile', {
            state: {
              justRegisteredEvent: eventName,
              registrationId,
              totalAmount,
              paymentStatus: 'COMPLETED',
              payment_id: paymentId,
              txnId: paymentId
            }
          });
        },
        modal: {
          ondismiss: function () {
            setPaymentStatus('FAILED');
            setErrorMessage("Payment was cancelled or dismissed. You can retry payment when ready.");
          }
        }
      };

      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          setPaymentStatus('FAILED');
          setErrorMessage(response.error?.description || "Payment transaction failed.");
        });
        rzp.open();
      } else {
        window.open(RAZORPAY_ME_URL, '_blank');
        setPaymentStatus('IDLE');
        setErrorMessage("Payment page opened in a new tab. After completing payment, enter your 12-digit UPI UTR below to confirm registration.");
      }
    } catch (err: any) {
      console.error("Payment Error:", err);
      setPaymentStatus('FAILED');
      setErrorMessage(err.message || "Failed to initiate Razorpay payment gateway.");
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(RAZORPAY_ME_URL)}&color=00f3ff&bgcolor=0a051d`;

  return (
    <div className="min-h-screen bg-[#04010d] text-white flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Cyberpunk Glow Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-purple-600/15 rounded-full blur-[110px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-xl bg-[#0a051c]/95 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl md:rounded-3xl shadow-[0_0_50px_rgba(0,243,255,0.15)] p-3.5 sm:p-7 relative z-10 my-4 box-border overflow-x-hidden">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <span className="text-[11px] font-mono text-cyan-400 font-extrabold uppercase tracking-wider">
            SECURE CHECKOUT NODE
          </span>

          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            256-BIT SSL SECURE
          </span>
        </div>

        {/* ================= SUCCESS STATE ================= */}
        {paymentStatus === 'SUCCESS' && (
          <div className="py-8 px-2 text-center flex flex-col items-center justify-center animate-fade-in">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                <svg className="w-10 h-10 text-emerald-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono uppercase mb-1">
              PAYMENT SUCCESSFUL!
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm max-w-sm mb-5 font-sans">
              Registration for <strong className="text-cyan-300">{eventName}</strong> is confirmed.
            </p>

            <div className="w-full bg-[#070318] border border-emerald-500/30 rounded-xl p-4 mb-5 text-left">
              <div className="flex justify-between items-center text-xs font-mono text-gray-400 mb-2">
                <span>TXN ID: <strong className="text-white">{txnId || 'PAY-VERIFIED'}</strong></span>
                <span className="text-emerald-400 font-bold">CONFIRMED</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden mb-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-center text-cyan-300 font-mono animate-pulse">
                Redirecting to dashboard in <strong className="text-white">{countdown}</strong>s...
              </p>
            </div>

            <button
              onClick={() => navigate('/profile', { state: { justRegisteredEvent: eventName, registrationId, payment_id: txnId } })}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black uppercase font-mono text-sm tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:scale-[1.01] transition-transform cursor-pointer"
            >
              VIEW STUDENT PROFILE &rarr;
            </button>
          </div>
        )}

        {/* ================= MAIN CHECKOUT UX ================= */}
        {paymentStatus !== 'SUCCESS' && (
          <div className="space-y-4">

            {/* Error Banner */}
            {paymentStatus === 'FAILED' && errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono flex items-start gap-2.5 animate-shake">
                <span className="text-base flex-shrink-0">⚠️</span>
                <div className="flex-1">
                  <strong className="block text-red-400 font-bold text-xs mb-0.5">Payment Notice</strong>
                  <p className="text-gray-300 text-[11.5px] leading-snug">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Clear Order Summary Card */}
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

            {/* HERO PRIMARY ACTION BUTTON */}
            <div className="pt-1">
              <button
                onClick={handlePayNow}
                disabled={paymentStatus === 'PROCESSING'}
                className="w-full py-3.5 sm:py-4 px-3 sm:px-5 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-black font-black text-sm sm:text-base uppercase font-mono tracking-wider shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer box-border"
              >
                {paymentStatus === 'PROCESSING' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>LAUNCHING PAYMENTS...</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">⚡</span>
                    <span className="truncate">PAY ₹{totalAmount} NOW (GPay / PhonePe / Cards)</span>
                  </>
                )}
              </button>
              <p className="text-[10.5px] font-mono text-center text-gray-400 mt-2">
                Instant verification &bull; Supports Google Pay, PhonePe, Paytm, Cards & NetBanking
              </p>
            </div>

            {/* COLLAPSIBLE ALTERNATE UPI & MANUAL UTR SECTION */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAlternateUpi(!showAlternateUpi)}
                className="w-full py-2.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] sm:text-xs font-mono text-purple-300 font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="shrink-0">📲</span>
                  <span className="truncate">Paid via QR Code or External App? Enter UTR Ref</span>
                </span>
                <span className="shrink-0">{showAlternateUpi ? '▲ Hide' : '▼ Expand'}</span>
              </button>

              {showAlternateUpi && (
                <div className="mt-3 p-4 rounded-xl bg-[#060214] border border-purple-500/30 space-y-4 animate-fade-in">
                  
                  {/* QR Code & Direct Link */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0a051d] p-3 rounded-lg border border-cyan-500/20">
                    <img
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      className="w-24 h-24 rounded-lg bg-white/5 p-1 object-contain flex-shrink-0"
                    />
                    <div className="space-y-1.5 text-center sm:text-left flex-1">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase block">1. SCAN QR & PAY ₹{totalAmount}</span>
                      <p className="text-[11px] text-gray-300 font-sans leading-tight">
                        Scan with GPay or PhonePe. Copy UPI link below if scanning on same phone:
                      </p>
                      <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                        <button
                          onClick={handleCopyUPI}
                          className="px-2.5 py-1 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold hover:bg-cyan-500/30"
                        >
                          {copied ? 'COPIED! ✅' : 'COPY UPI LINK 📋'}
                        </button>
                        <a
                          href={RAZORPAY_ME_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px] font-mono font-bold hover:bg-purple-500/30"
                        >
                          OPEN PAGE ↗
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* 12-Digit UTR Manual Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-cyan-300 font-bold block uppercase">
                      2. Enter 12-Digit UPI UTR / Ref No from App Receipt *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        className="flex-1 bg-[#03010a] border border-white/20 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none placeholder:text-gray-600"
                        placeholder="e.g. 420185938210"
                        value={utrInput}
                        onChange={(e) => setUtrInput(e.target.value)}
                      />
                      <button
                        onClick={handleVerifyUTR}
                        disabled={isSubmittingUtr || !utrInput.trim()}
                        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-mono font-bold uppercase transition-colors shadow-md flex-shrink-0 cursor-pointer"
                      >
                        {isSubmittingUtr ? 'VERIFYING...' : 'SUBMIT UTR'}
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Footer security tag */}
            <div className="text-center text-[10px] font-mono text-gray-500 pt-1">
              Envision'26 TechFest &bull; Official SSL Encrypted Payment Portal
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
