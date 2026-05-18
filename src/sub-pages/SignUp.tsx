import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CUNY_THEMES,
  DEFAULT_CUNY_THEME,
  getCunyThemeByName,
  type CunyTheme,
} from "../lib/cunyThemes";

const SIGNUP_COOLDOWN_SECONDS = 45;
const SIGNUP_FAIL_LIMIT = 4;
const SIGNUP_FAIL_KEY = "signup-failed-attempts";
const SIGNUP_LOCK_KEY = "signup-locked-until";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// ── Pixel skyline garnish (bottom of left panel) ──────────────────────────
const AuthSkyline = ({ accent }: { accent: string }) => (
  <svg
    viewBox="0 0 280 60"
    preserveAspectRatio="xMidYEnd slice"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block", width: "100%", height: 72, imageRendering: "pixelated", marginTop: 20 }}
    shapeRendering="crispEdges"
  >
    <g fill="rgba(255,255,255,.12)">
      <rect x="0" y="36" width="14" height="24" /><rect x="20" y="40" width="10" height="20" />
      <rect x="40" y="34" width="8" height="26" /><rect x="60" y="42" width="12" height="18" />
      <rect x="110" y="40" width="10" height="20" /><rect x="160" y="36" width="8" height="24" />
      <rect x="200" y="44" width="14" height="16" /><rect x="240" y="40" width="10" height="20" />
      <rect x="260" y="36" width="14" height="24" />
    </g>
    <g fill="rgba(255,255,255,.22)">
      <rect x="8" y="28" width="8" height="32" /><rect x="30" y="30" width="10" height="30" />
      <rect x="56" y="26" width="10" height="34" /><rect x="82" y="32" width="12" height="28" />
      <rect x="124" y="30" width="14" height="30" /><rect x="150" y="28" width="8" height="32" />
      <rect x="180" y="32" width="14" height="28" /><rect x="216" y="30" width="10" height="30" />
      <rect x="248" y="32" width="10" height="28" />
    </g>
    <g fill="rgba(255,255,255,.4)">
      <rect x="94" y="32" width="4" height="28" /><rect x="93" y="28" width="6" height="4" />
      <rect x="94" y="22" width="2" height="6" /><rect x="93" y="20" width="4" height="2" />
      <rect x="104" y="14" width="8" height="46" /><rect x="106" y="10" width="4" height="4" />
      <rect x="107" y="6" width="2" height="4" />
      <rect x="138" y="10" width="6" height="50" /><rect x="140" y="4" width="2" height="6" />
      <rect x="166" y="18" width="6" height="42" />
      <rect x="190" y="20" width="12" height="40" /><rect x="194" y="16" width="4" height="4" />
    </g>
    <g fill={accent}>
      <rect x="106" y="20" width="1" height="1" /><rect x="108" y="26" width="1" height="1" />
      <rect x="106" y="32" width="1" height="1" /><rect x="108" y="36" width="1" height="1" />
      <rect x="110" y="40" width="1" height="1" /><rect x="106" y="44" width="1" height="1" />
      <rect x="140" y="16" width="1" height="1" /><rect x="142" y="22" width="1" height="1" />
      <rect x="140" y="28" width="1" height="1" /><rect x="142" y="36" width="1" height="1" />
      <rect x="192" y="24" width="2" height="1" /><rect x="196" y="30" width="2" height="1" />
      <rect x="192" y="36" width="2" height="1" /><rect x="196" y="42" width="2" height="1" />
      <rect x="168" y="22" width="1" height="1" /><rect x="170" y="36" width="1" height="1" />
      <rect x="20" y="48" width="1" height="1" /><rect x="124" y="46" width="1" height="1" />
    </g>
  </svg>
);

// ── Left brand panel ────────────────────────────────────────────────────────
function CampusPanel({
  eyebrow,
  headline,
  accentLine,
  body,
  theme,
  showFacts = true,
}: {
  eyebrow: string;
  headline: string[];       // lines of the Anton title
  accentLine: string;       // last line — rendered outlined in accent
  body: string;
  theme: CunyTheme;
  showFacts?: boolean;
}) {
  return (
    <section
      className="relative flex min-h-[620px] flex-col overflow-hidden px-8 py-8 md:px-10"
      style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
    >
      {/* horizontal line texture */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.025) 3px 4px)" }} />

      {/* Top: badge + back */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black shadow-[0_0_0_3px_rgba(255,255,255,0.18)]"
            style={{ backgroundColor: theme.accent, color: theme.onAcc }}
          >
            {theme.badge}
          </span>
          <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 20, letterSpacing: "-.01em" }}>
            CUNY <span style={{ color: theme.accent }}>RE/</span>MARKET
          </span>
        </div>
        <Link to="/"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 600, opacity: .7 }}
          className="hover:opacity-100">
          ← back to site
        </Link>
      </div>

      {/* Middle: eyebrow + headline + deck */}
      <div className="relative z-10 mt-12 flex flex-1 flex-col justify-center">
        {/* eyebrow pill */}
        <div
          className="mb-5 inline-flex items-center gap-2 self-start rounded-full px-3 py-1"
          style={{ border: `1.5px solid ${theme.accent}`, color: theme.accent,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 600 }}
        >
          <span
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-black"
            style={{ backgroundColor: theme.accent, color: theme.onAcc }}
          >
            {theme.badge}
          </span>
          {eyebrow}
        </div>

        {/* Anton title */}
        <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(52px, 7vw, 90px)", lineHeight: .88, letterSpacing: "-.005em", textTransform: "uppercase", margin: 0 }}>
          {headline.map((line, i) => (
            <span key={i} style={{ display: "block" }}>{line}</span>
          ))}
          {/* Last line: outlined in accent color */}
          <span style={{ display: "block", color: "transparent", WebkitTextStroke: `2.5px ${theme.accent}` }}>
            {accentLine}
          </span>
        </h1>

        <p className="mt-5 max-w-xs leading-6 opacity-90"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 500 }}>
          {body}
        </p>
      </div>

      {/* Bottom: stats */}
      {showFacts && (
        <div className="relative z-10 mt-auto grid grid-cols-2 gap-6 pb-2">
          <div>
            <p style={{ fontFamily: "'Anton', sans-serif", fontSize: 30, lineHeight: 1, color: theme.accent }}>247</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 600, opacity: .75, marginTop: 2 }}>
              Active listings
            </p>
          </div>
          <div>
            <p style={{ fontFamily: "'Anton', sans-serif", fontSize: 30, lineHeight: 1, color: theme.accent }}>23</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 600, opacity: .75, marginTop: 2 }}>
              Free this week
            </p>
          </div>
        </div>
      )}

      <AuthSkyline accent={theme.accent} />
    </section>
  );
}

// ── 3-stop step indicator ───────────────────────────────────────────────────
function SignupStepper({ currentStep, theme }: { currentStep: 1 | 2 | 3; theme: CunyTheme }) {
  const steps = [
    { number: 1, label: "Email" },
    { number: 2, label: "Verify" },
    { number: 3, label: "Profile" },
  ];

  return (
    <div className="mb-8 flex items-center">
      {steps.map((step, index) => {
        const isDone = step.number < currentStep;
        const isActive = step.number === currentStep;
        return (
          <div key={step.number} className="flex items-center" style={{ flex: index < steps.length - 1 ? 1 : "none" }}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black"
                style={{
                  border: isDone ? `2px solid ${theme.primary}` : isActive ? `2px solid #1a1216` : "2px solid rgba(0,0,0,0.3)",
                  backgroundColor: isDone ? theme.primary : isActive ? theme.accent : theme.bg,
                  color: isDone ? theme.textOnPrimary : isActive ? theme.onAcc : "rgba(0,0,0,0.5)",
                  boxShadow: isActive ? `0 0 0 3px ${theme.bg}, 0 0 0 5px ${theme.primary}` : "none",
                }}
              >
                {isDone ? "✓" : step.number}
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: ".14em",
                  textTransform: "uppercase", fontWeight: 700,
                  color: isActive ? theme.primary : "rgba(0,0,0,0.45)",
                }}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className="mx-1 mb-5 flex-1"
                style={{ height: 2.5, backgroundColor: isDone ? theme.primary : "rgba(0,0,0,0.15)", borderRadius: 2 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

// ── Shared input / label style helpers ────────────────────────────────────
const fieldLabel: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  fontWeight: 600,
  color: "rgba(26,18,22,0.65)",
};

function AuthInput({
  theme,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { theme: CunyTheme }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      className={className}
      style={{
        width: "100%",
        padding: "12px 14px",
        border: `2px solid ${focused ? theme.primary : "#1a1216"}`,
        borderRadius: 8,
        fontFamily: "inherit",
        fontSize: 15,
        fontWeight: 500,
        backgroundColor: "#fff",
        color: "#1a1216",
        outline: "none",
        boxShadow: focused ? `3px 3px 0 ${theme.primary}` : "none",
        transition: "border-color .15s, box-shadow .15s",
        ...(props.style ?? {}),
      }}
    />
  );
}

export default function SignUp() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Step 2 fields
  const [signedUpEmail, setSignedUpEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [createdUserId, setCreatedUserId] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3 fields
  const [selectedCollege, setSelectedCollege] = useState(DEFAULT_CUNY_THEME.name);
  const [displayName, setDisplayName] = useState("");
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [bio, setBio] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const navigate = useNavigate();
  const otpCode = otpDigits.join("");
  const selectedTheme = getCunyThemeByName(selectedCollege);

  // ── Cooldown init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const lockedUntil = Number(window.sessionStorage.getItem(SIGNUP_LOCK_KEY));
    if (!lockedUntil) return;
    const nextRemaining = Math.max(Math.ceil((lockedUntil - Date.now()) / 1000), 0);
    setCooldownRemaining(nextRemaining);
  }, []);

  // ── Signup cooldown tick ───────────────────────────────────────────────────
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          window.sessionStorage.removeItem(SIGNUP_LOCK_KEY);
          window.sessionStorage.removeItem(SIGNUP_FAIL_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  // ── Resend cooldown tick ───────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { window.clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const CUNY_EMAIL_DOMAIN = "@login.cuny.edu";
  const isCunyEmail = (value: string) =>
    value.trim().toLowerCase().endsWith(CUNY_EMAIL_DOMAIN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || cooldownRemaining > 0) return;
    setLoading(true);
    setErrorMessage(null);
    const normalizedEmail = email.trim().toLowerCase();

    if (!isCunyEmail(normalizedEmail)) {
      setErrorMessage("Only CUNY emails ending with @login.cuny.edu are allowed.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-signup-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), email: normalizedEmail, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        const failedAttempts =
          Number(window.sessionStorage.getItem(SIGNUP_FAIL_KEY) ?? "0") + 1;
        window.sessionStorage.setItem(SIGNUP_FAIL_KEY, failedAttempts.toString());
        if (failedAttempts >= SIGNUP_FAIL_LIMIT) {
          const lockedUntil = Date.now() + SIGNUP_COOLDOWN_SECONDS * 1000;
          window.sessionStorage.setItem(SIGNUP_LOCK_KEY, lockedUntil.toString());
          setCooldownRemaining(SIGNUP_COOLDOWN_SECONDS);
          setErrorMessage(`Too many sign up attempts. Please wait ${SIGNUP_COOLDOWN_SECONDS}s and try again.`);
        } else {
          setErrorMessage(result.error ?? "Could not send verification code.");
        }
        return;
      }
      window.sessionStorage.removeItem(SIGNUP_FAIL_KEY);
      window.sessionStorage.removeItem(SIGNUP_LOCK_KEY);
      setSignedUpEmail(normalizedEmail);
      setResendCooldown(60);
      setStep(2);
    } catch {
      setErrorMessage("Could not reach the backend. Make sure npm start is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!signedUpEmail || resendLoading) return;
    setResendLoading(true);
    setResendMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-signup-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), email: signedUpEmail, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setResendMessage(result.error ?? "Could not resend code.");
        return;
      }
      setResendMessage("New code sent.");
      setResendCooldown(60);
    } catch {
      setResendMessage("Could not reach the backend. Make sure npm start is running.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otpCode.length !== 6 || otpLoading) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-signup-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signedUpEmail, code: otpCode }),
      });
      const result = await response.json();
      if (!response.ok) {
        setOtpError(result.error ?? "Could not verify code.");
        return;
      }
      setCreatedUserId(result.userId ?? "");
      setDisplayName(username.trim());
      setStep(3);
    } catch {
      setOtpError("Could not reach the backend. Make sure npm start is running.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...otpDigits];
      if (next[index]) {
        next[index] = "";
        setOtpDigits(next);
      } else if (index > 0) {
        next[index - 1] = "";
        setOtpDigits(next);
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter") {
      handleOtpVerify();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otpDigits];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleProfileFinish = async () => {
    if (!createdUserId || profileSaving) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/complete-signup-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: createdUserId,
          username: username.trim(),
          fullName: displayName.trim(),
          campus: selectedCollege,
          major: major.trim(),
          graduationYear: graduationYear.trim(),
          bio: bio.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setProfileError(result.error ?? "Could not save your campus profile.");
        return;
      }
      navigate("/login");
    } catch {
      setProfileError("Could not reach the backend. Make sure npm start is running.");
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const requirements = [
    { label: "8+ characters", test: password.length >= 8 },
    { label: "Contains a number", test: /\d/.test(password) },
    { label: "Contains a special character", test: /[@$!%*?&]/.test(password) },
  ];

  const isInvalid =
    !username.trim() ||
    password.length < 8 ||
    !/\d/.test(password) ||
    !/[@$!%*?&]/.test(password) ||
    confirmPassword !== password ||
    cooldownRemaining > 0;

  const resendCountdown = `${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, "0")}`;
  const validCunyEmail = isCunyEmail(email);

  // Left-panel content per step
  const panelProps: Record<1 | 2 | 3, { eyebrow: string; headline: string[]; accentLine: string; body: string; showFacts?: boolean }> = {
    1: {
      eyebrow: `New rider · joining ${selectedTheme.short}`,
      headline: ["Pick up", "where"],
      accentLine: "you study.",
      body: "The marketplace runs separately for each CUNY campus. Your email decides which one you board.",
    },
    2: {
      eyebrow: `New rider · joining ${selectedTheme.short}`,
      headline: ["Check", "your"],
      accentLine: "inbox.",
      body: `We just sent a 6-digit code to ${signedUpEmail}. Punch it in to confirm you're really at ${selectedTheme.short}.`,
    },
    3: {
      eyebrow: `New rider · joining ${selectedTheme.short}`,
      headline: ["One", "last"],
      accentLine: "thing.",
      body: "Set up your profile so your classmates know who they're meeting. You can change all of this later.",
      showFacts: false,
    },
  };

  // Primary pill button style
  const primaryBtn = (disabled: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "14px 18px",
    borderRadius: 999,
    border: `2px solid #1a1216`,
    backgroundColor: disabled ? "#e5e1d8" : selectedTheme.accent,
    color: disabled ? "#9a9590" : selectedTheme.onAcc,
    boxShadow: disabled ? "none" : "4px 4px 0 #1a1216",
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontSize: 15,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "transform .12s, box-shadow .12s",
  });

  const outlineBtn: React.CSSProperties = {
    width: "100%",
    padding: "12px 18px",
    borderRadius: 999,
    border: "2px solid #1a1216",
    backgroundColor: "transparent",
    color: "#1a1216",
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: selectedTheme.bg, padding: "24px 16px" }}>
      <div
        className="mx-auto overflow-hidden shadow-[12px_12px_0_rgba(0,0,0,0.08)]"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          maxWidth: 1100,
          minHeight: "calc(100vh - 48px)",
          border: "1px solid rgba(0,0,0,0.1)",
          backgroundColor: selectedTheme.bg,
        }}
      >
        <CampusPanel {...panelProps[step]} theme={selectedTheme} />

        {/* ── Right: form panel ─────────────────────────────────── */}
        <main className="flex items-center justify-center overflow-auto px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">

            {/* ── Step 1: Account ───────────────────────────────── */}
            {step === 1 && (
              <>
                <div className="mb-8 flex items-center justify-between"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 600, color: "rgba(0,0,0,0.5)" }}>
                  <span>Step 1 of 3 · Email</span>
                  <Link to="/login" style={{ color: selectedTheme.primary }}>Have an account? Sign in →</Link>
                </div>

                <SignupStepper currentStep={1} theme={selectedTheme} />

                <div className="mb-6">
                  <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.05, margin: "0 0 8px", color: "#1a1216" }}>
                    What's your <em style={{ fontStyle: "normal", color: selectedTheme.primary }}>campus email?</em>
                  </h2>
                  <p style={{ fontSize: 15, color: "rgba(0,0,0,0.6)", lineHeight: 1.5 }}>
                    We'll detect your campus and send a 6-digit verification code.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label style={fieldLabel}>Username</label>
                    <AuthInput
                      theme={selectedTheme}
                      type="text"
                      placeholder="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label style={fieldLabel}>Your CUNY Email</label>
                    <AuthInput
                      theme={selectedTheme}
                      type="email"
                      placeholder="firstname.lastname@login.cuny.edu"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {/* Campus detection chip */}
                    {validCunyEmail && (
                      <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                        style={{ borderColor: "rgba(0,0,0,0.15)", backgroundColor: "#fff" }}>
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black"
                          style={{ backgroundColor: selectedTheme.accent, color: selectedTheme.onAcc }}
                        >
                          {selectedTheme.badge}
                        </span>
                        <div className="flex-1">
                          <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 14, color: "#1a1216" }}>
                            Detected: {selectedTheme.name}
                          </p>
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(0,0,0,0.55)", marginTop: 2 }}>
                            247 active listings · 23 free this week
                          </p>
                        </div>
                        <span
                          className="rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                          style={{ backgroundColor: selectedTheme.accent, color: selectedTheme.onAcc }}
                        >
                          ✓ valid
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label style={fieldLabel}>Password</label>
                    <div className="relative">
                      <AuthInput
                        theme={selectedTheme}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ paddingRight: 44 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70 transition"
                        tabIndex={-1}
                      >
                        <EyeIcon open={showPassword} />
                      </button>
                    </div>
                    {password.length > 0 && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        {requirements.map((req, i) => (
                          <div key={i} className="flex items-center gap-1.5"
                            style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: req.test ? selectedTheme.primary : "rgba(0,0,0,0.4)" }}>
                            <span>{req.test ? "✔" : "○"}</span>
                            {req.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label style={fieldLabel}>Confirm Password</label>
                    <div className="relative">
                      <AuthInput
                        theme={selectedTheme}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{
                          paddingRight: 44,
                          borderColor: confirmPassword.length > 0 && confirmPassword !== password ? "#b91c1c" : undefined,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70 transition"
                        tabIndex={-1}
                      >
                        <EyeIcon open={showPassword} />
                      </button>
                    </div>
                    {confirmPassword.length > 0 && confirmPassword !== password && (
                      <p style={{ fontSize: 12, color: "#b91c1c", fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  {errorMessage && (
                    <div className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">!</span>
                      <p style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.4 }}>{errorMessage}</p>
                    </div>
                  )}

                  {cooldownRemaining > 0 && (
                    <p style={{ fontSize: 12, color: "#b45309", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                      Please wait {cooldownRemaining}s before trying again.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isInvalid || loading}
                    style={primaryBtn(isInvalid || loading)}
                    onMouseEnter={(e) => { if (!isInvalid && !loading) { (e.target as HTMLButtonElement).style.transform = "translate(-1px,-1px)"; (e.target as HTMLButtonElement).style.boxShadow = "5px 5px 0 #1a1216"; } }}
                    onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.transform = ""; (e.target as HTMLButtonElement).style.boxShadow = isInvalid || loading ? "none" : "4px 4px 0 #1a1216"; }}
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Sending code...
                      </>
                    ) : cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : "Send me a 6-digit code →"}
                  </button>

                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: ".06em", opacity: .55, lineHeight: 1.5, textAlign: "center" }}>
                    By continuing you agree to keep it civil. No reselling for profit.
                  </p>
                </form>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1" style={{ backgroundColor: "rgba(0,0,0,0.15)" }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".18em", fontWeight: 700, opacity: .5 }}>OR</span>
                  <div className="h-px flex-1" style={{ backgroundColor: "rgba(0,0,0,0.15)" }} />
                </div>

                <p className="text-center" style={{ fontSize: 14, color: "rgba(0,0,0,0.6)" }}>
                  Already have an account?{" "}
                  <Link to="/login" style={{ fontWeight: 800, color: selectedTheme.primary }}>Sign in →</Link>
                </p>

                <p className="mt-8" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, opacity: .5 }}>
                  v0.1.0
                  <span className="float-right">Privacy&nbsp;&nbsp;Terms</span>
                </p>
              </>
            )}

            {/* ── Step 2: Verify OTP ────────────────────────────── */}
            {step === 2 && (
              <>
                <div className="mb-8 flex items-center justify-between"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 600, color: "rgba(0,0,0,0.5)" }}>
                  <span>Step 2 of 3 · Verify</span>
                  <button
                    onClick={() => { setStep(1); setOtpDigits(["", "", "", "", "", ""]); setOtpError(null); }}
                    style={{ color: selectedTheme.primary, fontWeight: 700 }}
                  >
                    ← Change email
                  </button>
                </div>

                <SignupStepper currentStep={2} theme={selectedTheme} />

                <div className="mb-6">
                  <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.05, margin: "0 0 8px", color: "#1a1216" }}>
                    Enter the <em style={{ fontStyle: "normal", color: selectedTheme.primary }}>6-digit code</em>.
                  </h2>
                  <p style={{ fontSize: 14, color: "rgba(0,0,0,0.55)", lineHeight: 1.5 }}>
                    Sent to <strong style={{ color: "#1a1216" }}>{signedUpEmail}</strong>
                  </p>
                </div>

                {/* OTP boxes */}
                <div className="flex gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => {
                    const filled = !!digit;
                    const isCursor = !digit && (i === 0 || !!otpDigits[i - 1]);
                    return (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        autoFocus={i === 0}
                        placeholder="_"
                        style={{
                          flex: 1,
                          height: 60,
                          textAlign: "center",
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 28,
                          fontWeight: 700,
                          border: `2px solid ${filled ? selectedTheme.primary : "#1a1216"}`,
                          borderRadius: 10,
                          backgroundColor: filled ? selectedTheme.primary : "#fff",
                          color: filled ? selectedTheme.textOnPrimary : "#1a1216",
                          boxShadow: isCursor ? `3px 3px 0 ${selectedTheme.primary}` : "none",
                          outline: "none",
                          transition: "background .15s, border .15s",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Resend row */}
                <div className="mt-3 flex items-center justify-between" style={{ fontSize: 13, color: "rgba(0,0,0,0.55)" }}>
                  <span>Didn't get it?</span>
                  {resendCooldown > 0 ? (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: selectedTheme.primary }}>
                      Resend in {resendCountdown}
                    </span>
                  ) : (
                    <button
                      onClick={handleResendConfirmation}
                      disabled={resendLoading}
                      style={{ fontWeight: 800, color: selectedTheme.primary, fontFamily: "'Bricolage Grotesque', sans-serif" }}
                      className="hover:underline disabled:opacity-50"
                    >
                      {resendLoading ? "Sending..." : "Resend code"}
                    </button>
                  )}
                </div>

                {resendMessage && (
                  <p style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: selectedTheme.primary, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {resendMessage}
                  </p>
                )}

                {otpError && (
                  <div className="mt-3 flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">!</span>
                    <p style={{ fontSize: 13, color: "#b91c1c" }}>{otpError}</p>
                  </div>
                )}

                <button
                  onClick={handleOtpVerify}
                  disabled={otpCode.length !== 6 || otpLoading}
                  style={{ ...primaryBtn(otpCode.length !== 6 || otpLoading), marginTop: 24 }}
                >
                  {otpLoading ? "Verifying..." : "Verify code →"}
                </button>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1" style={{ backgroundColor: "rgba(0,0,0,0.15)" }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".18em", fontWeight: 700, opacity: .5 }}>OR</span>
                  <div className="h-px flex-1" style={{ backgroundColor: "rgba(0,0,0,0.15)" }} />
                </div>

                <button style={outlineBtn}>🎓 Verify via CUNYfirst SSO</button>

                <p className="mt-4 flex items-start gap-1.5" style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", lineHeight: 1.5 }}>
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black"
                    style={{ backgroundColor: selectedTheme.primary, color: selectedTheme.textOnPrimary }}>i</span>
                  Pro tip: check spam if it doesn't show in 60 seconds.
                </p>

                <p className="mt-8" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, opacity: .5 }}>
                  v0.1.0
                  <span className="float-right">Privacy&nbsp;&nbsp;Terms</span>
                </p>
              </>
            )}

            {/* ── Step 3: Profile ───────────────────────────────── */}
            {step === 3 && (
              <>
                <div className="mb-8 flex items-center justify-between"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 600, color: "rgba(0,0,0,0.5)" }}>
                  <span>Step 3 of 3 · Profile</span>
                  <button onClick={() => navigate("/")} style={{ color: selectedTheme.primary, fontWeight: 700 }}>
                    Skip for now →
                  </button>
                </div>

                <SignupStepper currentStep={3} theme={selectedTheme} />

                <div className="mb-5">
                  <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.05, margin: "0 0 6px", color: "#1a1216" }}>
                    Make it <em style={{ fontStyle: "italic", color: selectedTheme.primary }}>yours.</em>
                  </h2>
                  <p style={{ fontSize: 14, color: "rgba(0,0,0,0.55)" }}>Choose your CUNY college.</p>
                </div>

                {/* Campus selector */}
                <div className="mb-5">
                  <label style={fieldLabel}>Select your college</label>
                  <div className="mt-2 grid max-h-44 grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {CUNY_THEMES.map((theme) => {
                      const active = selectedCollege === theme.name;
                      return (
                        <button
                          key={theme.slug}
                          type="button"
                          onClick={() => setSelectedCollege(theme.name)}
                          className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition"
                          style={{
                            backgroundColor: active ? theme.primary : "#fff",
                            borderColor: active ? theme.primary : "rgba(0,0,0,0.15)",
                            color: active ? theme.textOnPrimary : "#1a1216",
                            fontWeight: 700,
                            fontFamily: "'Bricolage Grotesque', sans-serif",
                          }}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
                            style={{ backgroundColor: theme.accent, color: theme.onAcc }}>
                            {theme.badge}
                          </span>
                          <span className="truncate" style={{ fontSize: 13 }}>{theme.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Profile photo */}
                <div className="mb-5 flex items-center gap-3 rounded-lg border p-4"
                  style={{ borderColor: "rgba(0,0,0,0.12)", backgroundColor: "#fff" }}>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed"
                    style={{ borderColor: "rgba(0,0,0,0.25)", backgroundColor: "#f5f5f5" }}>
                    <svg className="h-6 w-6 text-black/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                  </div>
                  <div>
                    <p style={fieldLabel}>Profile photo</p>
                    <p style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginTop: 2 }}>Optional, but classmates buy faster from named faces.</p>
                    <div className="mt-2 flex gap-3">
                      <button style={{ fontSize: 12, fontWeight: 800, color: selectedTheme.primary }} className="hover:underline">Upload</button>
                      <button style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }} className="hover:underline">Skip</button>
                    </div>
                  </div>
                </div>

                {/* Profile fields */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label style={fieldLabel}>Display name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={username || "Your name"}
                      style={{ width: "100%", padding: "12px 14px", border: "1.5px solid rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 15, fontWeight: 500, backgroundColor: "#fff", color: "#1a1216", outline: "none" }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label style={fieldLabel}>Major / Dept</label>
                      <input
                        type="text"
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        placeholder="Computer Science"
                        style={{ width: "100%", padding: "12px 14px", border: "1.5px solid rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 15, fontWeight: 500, backgroundColor: "#fff", color: "#1a1216", outline: "none" }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label style={fieldLabel}>Year</label>
                      <input
                        type="text"
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        placeholder="Senior"
                        style={{ width: "100%", padding: "12px 14px", border: "1.5px solid rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 15, fontWeight: 500, backgroundColor: "#fff", color: "#1a1216", outline: "none" }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label style={fieldLabel}>
                      Short bio <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11, opacity: .7 }}>(Optional)</span>
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="e.g. CS senior, mostly selling old CS & math books."
                      rows={3}
                      style={{ width: "100%", padding: "12px 14px", border: "1.5px solid rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 15, fontWeight: 500, backgroundColor: "#fff", color: "#1a1216", outline: "none", resize: "none", fontFamily: "inherit" }}
                    />
                  </div>

                  {profileError && (
                    <div className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">!</span>
                      <p style={{ fontSize: 13, color: "#b91c1c" }}>{profileError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleProfileFinish}
                    disabled={profileSaving}
                    style={primaryBtn(profileSaving)}
                  >
                    {profileSaving ? "Saving..." : `Finish — take me to ${selectedTheme.short} →`}
                  </button>
                </div>

                <p className="mt-8" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, opacity: .5 }}>
                  v0.1.0
                  <span className="float-right">Privacy&nbsp;&nbsp;Terms</span>
                </p>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
