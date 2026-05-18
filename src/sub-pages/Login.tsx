import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase-client";
import { useUser } from "../Contexts/UserContext";
import { DEFAULT_CUNY_THEME, type CunyTheme } from "../lib/cunyThemes";

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_COOLDOWN_SECONDS = 30;
const LOGIN_FAIL_KEY = "login-failed-attempts";
const LOGIN_LOCK_KEY = "login-locked-until";

const t = DEFAULT_CUNY_THEME; // Hunter — login has no campus selector

// ── Pixel NYC skyline ──────────────────────────────────────────────────────
const AuthSkyline = ({ accent }: { accent: string }) => (
  <svg
    viewBox="0 0 280 60"
    preserveAspectRatio="xMidYEnd slice"
    shapeRendering="crispEdges"
    style={{ display: "block", width: "100%", height: 72, imageRendering: "pixelated", marginTop: 20 }}
  >
    <g fill="rgba(255,255,255,0.18)">
      <rect x="4"   y="38" width="14" height="22" /><rect x="6"   y="32" width="10" height="6" />
      <rect x="22"  y="30" width="18" height="30" /><rect x="26"  y="24" width="10" height="6" />
      <rect x="44"  y="36" width="12" height="24" />
      <rect x="60"  y="28" width="20" height="32" /><rect x="64"  y="22" width="12" height="6" />
      <rect x="84"  y="34" width="14" height="26" />
      <rect x="102" y="26" width="22" height="34" /><rect x="106" y="20" width="14" height="6" />
      <rect x="128" y="38" width="10" height="22" />
      <rect x="142" y="30" width="16" height="30" /><rect x="146" y="24" width="8"  height="6" />
      <rect x="162" y="36" width="12" height="24" />
      <rect x="178" y="28" width="20" height="32" /><rect x="182" y="22" width="12" height="6" />
      <rect x="202" y="34" width="14" height="26" />
      <rect x="220" y="26" width="22" height="34" /><rect x="224" y="20" width="14" height="6" />
      <rect x="246" y="38" width="10" height="22" />
      <rect x="260" y="30" width="20" height="30" /><rect x="264" y="24" width="12" height="6" />
    </g>
    <g fill="rgba(255,255,255,0.30)">
      <rect x="0"   y="42" width="18" height="18" />
      <rect x="20"  y="34" width="22" height="26" /><rect x="24"  y="28" width="14" height="6" />
      <rect x="46"  y="40" width="16" height="20" />
      <rect x="66"  y="32" width="24" height="28" /><rect x="70"  y="26" width="16" height="6" />
      <rect x="94"  y="38" width="18" height="22" />
      <rect x="116" y="30" width="26" height="30" /><rect x="120" y="24" width="18" height="6" />
      <rect x="146" y="42" width="14" height="18" />
      <rect x="164" y="34" width="20" height="26" /><rect x="168" y="28" width="12" height="6" />
      <rect x="188" y="38" width="18" height="22" />
      <rect x="210" y="30" width="26" height="30" /><rect x="214" y="24" width="18" height="6" />
      <rect x="240" y="42" width="14" height="18" />
      <rect x="258" y="34" width="22" height="26" /><rect x="262" y="28" width="14" height="6" />
    </g>
    <g fill="rgba(255,255,255,0.50)">
      <rect x="0"   y="46" width="20" height="14" />
      <rect x="24"  y="36" width="28" height="24" /><rect x="28"  y="30" width="20" height="6" /><rect x="32"  y="26" width="12" height="4" />
      <rect x="56"  y="44" width="22" height="16" />
      <rect x="82"  y="34" width="30" height="26" /><rect x="86"  y="28" width="22" height="6" /><rect x="90"  y="22" width="14" height="6" />
      <rect x="116" y="46" width="20" height="14" />
      <rect x="140" y="36" width="28" height="24" /><rect x="144" y="30" width="20" height="6" /><rect x="148" y="26" width="12" height="4" />
      <rect x="172" y="44" width="22" height="16" />
      <rect x="198" y="34" width="30" height="26" /><rect x="202" y="28" width="22" height="6" /><rect x="206" y="22" width="14" height="6" />
      <rect x="232" y="46" width="20" height="14" />
      <rect x="256" y="36" width="24" height="24" /><rect x="260" y="30" width="16" height="6" />
    </g>
    <g fill={accent}>
      <rect x="27"  y="33" width="3" height="3" /><rect x="33"  y="37" width="3" height="3" />
      <rect x="68"  y="29" width="3" height="3" /><rect x="74"  y="35" width="3" height="3" />
      <rect x="88"  y="31" width="3" height="3" /><rect x="94"  y="39" width="3" height="3" />
      <rect x="107" y="23" width="3" height="3" /><rect x="113" y="31" width="3" height="3" />
      <rect x="147" y="33" width="3" height="3" /><rect x="153" y="37" width="3" height="3" />
      <rect x="169" y="29" width="3" height="3" /><rect x="175" y="35" width="3" height="3" />
      <rect x="203" y="31" width="3" height="3" /><rect x="209" y="39" width="3" height="3" />
      <rect x="215" y="23" width="3" height="3" /><rect x="221" y="31" width="3" height="3" />
      <rect x="263" y="33" width="3" height="3" /><rect x="269" y="37" width="3" height="3" />
    </g>
  </svg>
);

// ── Left brand panel ───────────────────────────────────────────────────────
function CampusPanel({ theme }: { theme: CunyTheme }) {
  return (
    <section
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minHeight: 560,
        overflow: "hidden",
        backgroundColor: theme.primary,
        color: theme.textOnPrimary,
        padding: "32px 40px",
      }}
    >
      {/* line texture */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.12, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)",
        backgroundSize: "100% 7px",
      }} />

      {/* top bar */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: "50%",
            backgroundColor: theme.accent, color: theme.onAcc,
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 13, fontWeight: 900,
            boxShadow: `0 0 0 3px ${theme.primary}, 0 0 0 5px ${theme.accent}50`,
          }}>
            {theme.badge}
          </span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            CUNY <span style={{ color: theme.accent }}>RE</span>MARKET
          </span>
        </div>
        <Link
          to="/"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, fontWeight: 700,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: `${theme.textOnPrimary}99`,
            textDecoration: "none",
          }}
        >
          Back to site
        </Link>
      </div>

      {/* headline area */}
      <div style={{ position: "relative", zIndex: 10, marginTop: 52 }}>
        {/* eyebrow pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          borderRadius: 999, border: `1.5px solid ${theme.accent}`,
          padding: "4px 12px 4px 6px", marginBottom: 20,
        }}>
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 18, height: 18, borderRadius: "50%",
            backgroundColor: theme.accent, color: theme.onAcc,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, fontWeight: 900,
          }}>
            {theme.badge}
          </span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, fontWeight: 900,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: theme.accent,
          }}>
            {theme.short} · Welcome back
          </span>
        </div>

        {/* Anton hero headline */}
        <h1 style={{
          fontFamily: "'Anton', sans-serif",
          fontSize: "clamp(52px, 7vw, 90px)",
          lineHeight: 0.88,
          textTransform: "uppercase",
          margin: 0,
          letterSpacing: "-0.01em",
        }}>
          <span style={{ display: "block" }}>Buy, sell</span>
          <span style={{ display: "block" }}>{"& swap"}</span>
          <span style={{
            display: "block",
            color: "transparent",
            WebkitTextStroke: `2.5px ${theme.accent}`,
          }}>
            within CUNY.
          </span>
        </h1>

        <p style={{
          marginTop: 20, maxWidth: 280,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 13, fontWeight: 500, lineHeight: 1.65,
          color: `${theme.textOnPrimary}CC`,
        }}>
          A campus-only marketplace for students. Sign in with your CUNY email to keep buying, selling, and swapping with classmates.
        </p>
      </div>

      {/* stats */}
      <div style={{
        position: "relative", zIndex: 10,
        marginTop: "auto",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24,
      }}>
        <div>
          <p style={{ fontFamily: "'Anton', sans-serif", fontSize: 36, lineHeight: 1, color: theme.accent, margin: 0 }}>247</p>
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase",
            color: `${theme.textOnPrimary}99`, marginTop: 4,
          }}>Active listings</p>
        </div>
        <div>
          <p style={{ fontFamily: "'Anton', sans-serif", fontSize: 36, lineHeight: 1, color: theme.accent, margin: 0 }}>23</p>
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase",
            color: `${theme.textOnPrimary}99`, marginTop: 4,
          }}>Free this week</p>
        </div>
      </div>

      <AuthSkyline accent={theme.accent} />
    </section>
  );
}

// ── Input with focus-offset shadow ─────────────────────────────────────────
function AuthInput({
  theme,
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { theme: CunyTheme }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: "100%",
        border: `2px solid ${focused ? theme.primary : "#1a1216"}`,
        borderRadius: 8,
        backgroundColor: "#ffffff",
        padding: "12px 16px",
        fontSize: 14,
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 600,
        color: "#1a1216",
        outline: "none",
        boxSizing: "border-box",
        boxShadow: focused ? `3px 3px 0 ${theme.primary}` : "none",
        transition: "box-shadow 0.12s, border-color 0.12s",
        ...style,
      }}
    />
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [welcomeUsername, setWelcomeUsername] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const navigate = useNavigate();

  const { setUserId } = useUser();

  useEffect(() => {
    const lockedUntil = Number(window.sessionStorage.getItem(LOGIN_LOCK_KEY));
    if (!lockedUntil) return;
    const nextRemaining = Math.max(Math.ceil((lockedUntil - Date.now()) / 1000), 0);
    setCooldownRemaining(nextRemaining);
  }, []);

  const CUNY_EMAIL_DOMAIN = "@login.cuny.edu";

  const isCunyEmail = (value: string) =>
    value.trim().toLowerCase().endsWith(CUNY_EMAIL_DOMAIN);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          window.sessionStorage.removeItem(LOGIN_LOCK_KEY);
          window.sessionStorage.removeItem(LOGIN_FAIL_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || cooldownRemaining > 0) return;

    setErrorMessage(null);
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    if (!isCunyEmail(normalizedEmail)) {
      setErrorMessage("Only CUNY emails ending with @login.cuny.edu are allowed.");
      setLoading(false);
      return;
    }

    // connected with supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      const failedAttempts =
        Number(window.sessionStorage.getItem(LOGIN_FAIL_KEY) ?? "0") + 1;
      window.sessionStorage.setItem(LOGIN_FAIL_KEY, failedAttempts.toString());

      if (failedAttempts >= LOGIN_ATTEMPT_LIMIT) {
        const lockedUntil = Date.now() + LOGIN_COOLDOWN_SECONDS * 1000;
        window.sessionStorage.setItem(LOGIN_LOCK_KEY, lockedUntil.toString());
        setCooldownRemaining(LOGIN_COOLDOWN_SECONDS);
        setErrorMessage(
          `Too many attempts. Please wait ${LOGIN_COOLDOWN_SECONDS}s before trying again.`
        );
      } else {
        setErrorMessage("Invalid email or password.");
      }

      setLoading(false);
      return;
    }

    window.sessionStorage.removeItem(LOGIN_FAIL_KEY);
    window.sessionStorage.removeItem(LOGIN_LOCK_KEY);

    const username = data.user?.user_metadata?.username ?? "there";

    setUserId(data?.user?.id);
    setWelcomeUsername(username); // show welcome message before redirecting
    setTimeout(() => {
      navigate("/"); // bring user to homepage on successful login can do navigate(-1) to go to last page
    }, 1800);
  };

  const disabled = loading || cooldownRemaining > 0;

  // ── Welcome flash ────────────────────────────────────────────────────────
  if (welcomeUsername) {
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: t.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {/* checkmark circle */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            backgroundColor: t.primary,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 0 6px ${t.bg}, 0 0 0 10px ${t.primary}40`,
          }}>
            <svg width="32" height="32" viewBox="0 0 52 52" fill="none">
              <polyline points="10,26 20,36 42,14" fill="none"
                stroke={t.accent} strokeWidth="5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div style={{ textAlign: "center" }}>
            <h2 style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: 36, textTransform: "uppercase",
              letterSpacing: "-0.01em", lineHeight: 1,
              color: "#1a1216", margin: 0,
            }}>
              Welcome,{" "}
              <span style={{ color: t.primary }}>{welcomeUsername}!</span>
            </h2>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#1a1216AA",
              marginTop: 10,
            }}>
              Taking you to CUNY ReMarket...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main login form ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", backgroundColor: t.bg, padding: "24px 16px" }}>
      <div style={{
        margin: "0 auto",
        maxWidth: 1100,
        minHeight: "calc(100vh - 48px)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "12px 12px 0 rgba(0,0,0,0.07)",
      }}>
        <CampusPanel theme={t} />

        <main style={{
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 40px",
        }}>
          <div style={{ width: "100%", maxWidth: 400 }}>
            {/* nav row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 40,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, fontWeight: 700,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "rgba(0,0,0,0.45)",
            }}>
              <span style={{ color: "#1a1216" }}>Sign in</span>
              <Link to="/signup" style={{ color: "inherit", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = t.primary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(0,0,0,0.45)")}
              >
                Create account →
              </Link>
            </div>

            {/* heading */}
            <div style={{ marginBottom: 32 }}>
              <p style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, fontWeight: 900,
                letterSpacing: "0.2em", textTransform: "uppercase",
                color: t.primary, margin: "0 0 8px",
              }}>
                Welcome back
              </p>
              <h2 style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 28, fontWeight: 800,
                letterSpacing: "-0.02em", lineHeight: 1.15,
                color: "#1a1216", margin: 0,
              }}>
                Sign in with your CUNY email.
              </h2>
              <p style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 13, fontWeight: 500, lineHeight: 1.65,
                color: "rgba(0,0,0,0.55)",
                marginTop: 10,
              }}>
                Use your @login.cuny.edu address to get back to your marketplace.
              </p>
            </div>

            {/* form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* email */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9, fontWeight: 900,
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "rgba(0,0,0,0.65)",
                }}>
                  CUNY Email
                </label>
                <AuthInput
                  theme={t}
                  type="email"
                  placeholder="firstname.lastname@login.cuny.edu"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9, fontWeight: 900,
                    letterSpacing: "0.16em", textTransform: "uppercase",
                    color: "rgba(0,0,0,0.65)",
                  }}>
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9, fontWeight: 700,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      color: t.primary, textDecoration: "none",
                    }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    style={{
                      width: "100%",
                      border: `2px solid ${passwordFocused ? t.primary : "#1a1216"}`,
                      borderRadius: 8,
                      backgroundColor: "#ffffff",
                      padding: "12px 44px 12px 16px",
                      fontSize: 14,
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: 600,
                      color: "#1a1216",
                      outline: "none",
                      boxSizing: "border-box",
                      boxShadow: passwordFocused ? `3px 3px 0 ${t.primary}` : "none",
                      transition: "box-shadow 0.12s, border-color 0.12s",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    style={{
                      position: "absolute", right: 12, top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none",
                      cursor: "pointer", padding: 0,
                      color: "rgba(0,0,0,0.35)",
                      display: "flex", alignItems: "center",
                    }}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* error */}
              {errorMessage && (
                <div style={{
                  border: "1.5px solid #fca5a5",
                  borderRadius: 8,
                  backgroundColor: "#fef2f2",
                  padding: "10px 14px",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: 13, fontWeight: 600,
                  color: "#dc2626",
                }}>
                  {errorMessage}
                </div>
              )}

              {/* submit pill button */}
              <button
                type="submit"
                disabled={disabled}
                style={{
                  marginTop: 4,
                  width: "100%",
                  padding: "14px 24px",
                  borderRadius: 999,
                  border: "2px solid #1a1216",
                  backgroundColor: disabled ? "#e5e1d8" : t.accent,
                  color: disabled ? "#9a9590" : t.onAcc,
                  boxShadow: disabled ? "none" : "4px 4px 0 #1a1216",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: 15, fontWeight: 800,
                  letterSpacing: "-0.01em",
                  cursor: disabled ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "box-shadow 0.1s, transform 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "5px 5px 0 #1a1216";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "4px 4px 0 #1a1216";
                  }
                }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
                      style={{ animation: "spin 0.8s linear infinite" }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"
                        style={{ opacity: 0.25 }} />
                      <path fill="currentColor" style={{ opacity: 0.75 }}
                        d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing in...
                  </>
                ) : cooldownRemaining > 0 ? (
                  `Wait ${cooldownRemaining}s`
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
              <div style={{ flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.12)" }} />
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, fontWeight: 700,
                letterSpacing: "0.2em", textTransform: "uppercase",
                color: "rgba(0,0,0,0.35)",
              }}>or</span>
              <div style={{ flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.12)" }} />
            </div>

            {/* create account link */}
            <p style={{
              textAlign: "center",
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 13, fontWeight: 500,
              color: "rgba(0,0,0,0.55)",
            }}>
              Don't have an account?{" "}
              <Link
                to="/signup"
                style={{
                  fontWeight: 800,
                  color: t.primary,
                  textDecoration: "none",
                }}
              >
                Create one
              </Link>
            </p>

            {/* footer */}
            <p style={{
              marginTop: 40,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, fontWeight: 500,
              color: "rgba(0,0,0,0.28)",
              display: "flex", justifyContent: "space-between",
            }}>
              <span>v0.1.0</span>
              <span>Privacy&nbsp;&nbsp;Terms</span>
            </p>
          </div>
        </main>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
