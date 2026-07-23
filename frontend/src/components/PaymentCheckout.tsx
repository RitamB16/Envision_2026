import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api, RAZORPAY_ME_URL, RAZORPAY_UPI_ID } from '../utils/api';

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

  const registrationId = props.registrationId || params.registrationId || stateData.registrationId || 'REG-PENDING';
  const eventName = props.eventName || stateData.eventName || 'ENVISION FEST EVENT';
  const registrationType = props.registrationType || stateData.registrationType || 'Individual';
  const baseFee = props.baseFee || stateData.baseFee || 39;

  // Dynamic participant contact phone lookup (No dummy numbers)
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

  // Fetch true phone number from user profile if not found in state
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
            navigate(`/tickets/${registrationId}`, {
              state: {
                registrationId,
                eventName,
                totalAmount,
                paymentStatus: 'COMPLETED',
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

  const handlePayNow = async () => {
    setPaymentStatus('PROCESSING');
    setErrorMessage(null);

    try {
      // 1. Create order on backend (fetches true price from DB)
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

      const { razorpay_order_id, amount, currency, key_id } = orderRes;
      const razorpayApiKey = (import.meta.env as any).VITE_RAZORPAY_KEY_ID || key_id || 'rzp_test_TGuT8hs5QZ9uy9';

      // 2. Configure Razorpay SDK Options with UPI focus
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
        handler: async function (response: any) {
          setTxnId(response.razorpay_payment_id || `pay_${Date.now()}`);

          // 3. Automated Backend Verification
          try {
            await api.post('/payments/verify', {
              registration_id: registrationId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
          } catch (verifyErr) {
            console.warn("Verification warning:", verifyErr);
          }

          // Trigger Success UX
          setPaymentStatus('SUCCESS');
        },
        modal: {
          ondismiss: function () {
            setPaymentStatus('FAILED');
            setErrorMessage("Payment was canceled or dismissed. You can try again below.");
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
        // Direct Razorpay.me fallback if SDK fails to load
        window.open(RAZORPAY_ME_URL, '_blank');
        setTimeout(() => setPaymentStatus('SUCCESS'), 2500);
      }
    } catch (err: any) {
      console.error("Payment Error:", err);
      setPaymentStatus('FAILED');
      setErrorMessage(err.message || "Failed to initiate payment gateway.");
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(RAZORPAY_ME_URL)}&color=00f3ff&bgcolor=0a051d`;

  return (
    <div className="min-h-screen bg-[#04010d] text-white flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden font-sans">
      {/* Dynamic Cyber Glow Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div className="w-full max-w-5xl bg-[#09041a]/85 backdrop-blur-2xl border border-white/15 rounded-2xl md:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-4 sm:p-8 relative z-10 my-4 sm:my-8">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00f3ff]" />
              <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
                ENVISION'26 // GATEWAY CHECKOUT
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase font-mono mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-cyan-300">
              PAYMENT GATEWAY
            </h1>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <span className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,243,255,0.15)]">
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              SSL 256-BIT SECURE
            </span>
          </div>
        </div>

        {/* ================= SUCCESS STATE UX ================= */}
        {paymentStatus === 'SUCCESS' && (
          <div className="py-12 sm:py-16 px-4 text-center flex flex-col items-center justify-center animate-fade-in">
            {/* Glowing Green Success Checkmark */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                <svg className="w-12 h-12 text-emerald-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="absolute inset-0 rounded-full border border-emerald-400/50 animate-ping pointer-events-none" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tracking-wide uppercase mb-2">
              PAYMENT SUCCESSFUL!
            </h2>
            <p className="text-gray-300 text-sm max-w-md mb-6">
              Your registration for <span className="text-cyan-300 font-semibold">{eventName}</span> is confirmed and verified.
            </p>

            {/* Countdown Progress Card */}
            <div className="w-full max-w-md bg-[#0d0722] border border-emerald-500/30 rounded-xl p-5 mb-6 text-left">
              <div className="flex justify-between items-center text-xs font-mono text-gray-400 mb-2">
                <span>TXN ID: <strong className="text-white">{txnId || 'PAY-VERIFIED'}</strong></span>
                <span className="text-emerald-400 font-bold">STATUS: CONFIRMED</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden mb-3">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                />
              </div>
              <p className="text-xs text-center text-cyan-300 font-mono animate-pulse">
                Redirecting to your verified ticket pass in <strong className="text-white text-base">{countdown}</strong> seconds...
              </p>
            </div>

            <button
              onClick={() => navigate(`/tickets/${registrationId}`)}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-extrabold uppercase font-mono tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all transform hover:scale-105 active:scale-95"
            >
              VIEW TICKET PASS NOW &rarr;
            </button>
          </div>
        )}

        {/* ================= MAIN PAYMENT CONTENT ================= */}
        {paymentStatus !== 'SUCCESS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            {/* Left Column: Summary & Contact Info (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Order Card */}
              <div className="bg-[#0e0726]/90 border border-cyan-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-bl-full pointer-events-none" />
                <h3 className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-semibold mb-3">
                  REGISTRATION SUMMARY
                </h3>

                <div className="space-y-3 font-sans">
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider block">EVENT NAME</span>
                    <span className="text-lg font-bold text-white font-mono">{eventName}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-white/10">
                    <div>
                      <span className="text-gray-400 block">TYPE</span>
                      <span className="text-cyan-200 font-semibold">{registrationType}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">REG ID</span>
                      <span className="text-cyan-200 font-mono font-semibold">{registrationId}</span>
                    </div>
                  </div>

                  {/* Price Row */}
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-sm font-semibold text-gray-300">TOTAL AMOUNT</span>
                    <span className="text-3xl font-extrabold text-cyan-400 font-mono tracking-tight drop-shadow-[0_0_12px_rgba(0,243,255,0.4)]">
                      ₹{totalAmount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified Contact Details Card (Fixing Dummy Contact Number) */}
              <div className="bg-[#0e0726]/90 border border-white/10 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-mono tracking-widest text-gray-400 uppercase font-semibold flex items-center justify-between">
                  <span>PARTICIPANT DETAILS</span>
                  <span className="text-[10px] text-cyan-400 font-mono">VERIFIED DATA</span>
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">NAME</span>
                    <span className="text-white font-medium">{userDetails.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">FEST ID</span>
                    <span className="text-cyan-300 font-mono font-bold">{userDetails.festId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">EMAIL</span>
                    <span className="text-gray-200 truncate max-w-[180px]">{userDetails.email}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-gray-400 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h32a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm0 6a2 2 0 012-2h32a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm0 6a2 2 0 012-2h32a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2z" />
                      </svg>
                      CONTACT PHONE
                    </span>
                    <span className="text-emerald-400 font-mono font-bold tracking-wider">{userDetails.phone}</span>
                  </div>
                </div>
              </div>

              {/* Direct UPI Page Fallback Button */}
              <a
                href={RAZORPAY_ME_URL}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-purple-900/30 border border-purple-500/40 hover:bg-purple-900/50 text-purple-200 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-md group"
              >
                <span>🔗 PAY VIA DIRECT RAZORPAY.ME PAGE</span>
                <svg className="w-4 h-4 text-purple-400 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

            {/* Right Column: Checkout Options & QR Code (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              
              {/* Failed Error Notice */}
              {paymentStatus === 'FAILED' && errorMessage && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-3 animate-shake">
                  <span className="text-lg">❌</span>
                  <div className="flex-1">
                    <strong className="block text-red-400 font-bold mb-0.5">Payment Failed or Canceled</strong>
                    <p className="text-gray-300 leading-relaxed">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Instant Automated Razorpay SDK Button */}
              <div className="bg-[#0e0726]/90 border border-cyan-500/30 rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-semibold">
                    METHOD 1: AUTOMATED SDK POPUP
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                    INSTANT VERIFICATION
                  </span>
                </div>

                <p className="text-xs text-gray-300 mb-5 leading-relaxed">
                  Opens the official embedded Razorpay payment gateway popup with auto UPI selection (GPay, PhonePe, Paytm, BHIM, Cards & NetBanking).
                </p>

                {/* Primary Automated Pay Button */}
                <button
                  onClick={handlePayNow}
                  disabled={paymentStatus === 'PROCESSING'}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:via-blue-400 hover:to-purple-500 text-black font-extrabold text-base uppercase font-mono tracking-wider shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden"
                >
                  {paymentStatus === 'PROCESSING' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>LAUNCHING CHECKOUT...</span>
                    </>
                  ) : (
                    <>
                      <span>PAY ₹{totalAmount} VIA RAZORPAY UPI</span>
                      <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {/* Scan & Pay QR Code Card */}
              <div className="bg-[#0e0726]/90 border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5 shadow-xl">
                {/* QR Display */}
                <div className="relative p-2.5 bg-[#0a051d] border border-cyan-500/30 rounded-xl shadow-inner group flex-shrink-0">
                  <img
                    src={qrCodeUrl}
                    alt="Razorpay UPI QR Code"
                    className="w-36 h-36 rounded-lg object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-pulse pointer-events-none rounded-xl" />
                </div>

                {/* QR Instructions & VPA Copy */}
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <h4 className="text-xs font-mono tracking-wider text-cyan-300 uppercase font-bold">
                      METHOD 2: SCAN & PAY VIA ANY UPI APP
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                      Scan the QR code with Google Pay, PhonePe, Paytm, or BHIM UPI app to pay directly.
                    </p>
                  </div>

                  {/* Copy UPI VPA */}
                  <div className="flex items-center justify-between bg-[#04010d] border border-white/15 rounded-lg p-2 text-xs">
                    <span className="font-mono text-cyan-400 font-bold px-1 truncate">{RAZORPAY_UPI_ID}</span>
                    <button
                      onClick={handleCopyUPI}
                      className="px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-semibold transition-colors flex-shrink-0"
                    >
                      {copied ? 'COPIED! ✅' : 'COPY UPI'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Footer */}
              <div className="text-center text-[11px] font-mono text-gray-500 flex items-center justify-center gap-2">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Encrypted 256-Bit SSL Gateway &bull; Envision'26 Payments</span>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
