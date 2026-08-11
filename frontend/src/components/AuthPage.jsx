import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function PasswordInput({
  value,
  onChange,
  label = "Password",
  autoComplete = "current-password",
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <span className="relative mt-2 block">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="auth-input pr-14"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setVisible((show) => !show)}
          className="absolute inset-y-0 right-0 px-4 text-xs font-extrabold text-muted hover:text-ink cursor-pointer"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}

function Brand() {
  return (
    <div className="relative z-10 text-center sm:text-left">
      <div className="inline-flex items-center gap-2.5 text-ink">
        <svg width="42" height="24" viewBox="0 0 240 24" aria-hidden="true">
          <path
            d="M0 12 H70 L84 2 L98 22 L112 6 L124 12 H240"
            stroke="var(--color-accent)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span className="font-display text-xl font-extrabold tracking-tight">
          PulseFit Coach
        </span>
      </div>
    </div>
  );
}

export default function AuthPage({ type }) {
  const { login, signup, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignUp = type === "signup";
  const isForgot = type === "forgot";
  const title = isForgot
    ? "Reset your password"
    : isSignUp
      ? "Build your stronger routine"
      : "Welcome back";
  const subtitle = isForgot
    ? "Enter your email and we’ll send reset instructions."
    : isSignUp
      ? "Start training smarter with your AI fitness coach."
      : "Sign in to continue your training conversation.";
  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const email = form.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email))
      return setError("Enter a valid email address.");
    if (!isForgot && form.password.length < 8)
      return setError("Your password must be at least 8 characters.");
    if (isSignUp && !form.name.trim())
      return setError("Tell us what we should call you.");
    if (isSignUp && form.password !== form.confirmPassword)
      return setError("Your passwords don’t match.");
    setLoading(true);
    try {
      if (isForgot) {
        const result = await requestPasswordReset(email);
        setSuccess(
          result.message ||
            "If an account exists for that email, reset instructions are on their way.",
        );
      } else {
        await (isSignUp
          ? signup({ name: form.name.trim(), email, password: form.password })
          : login({ email, password: form.password }));
        navigate(location.state?.from?.pathname || "/chat", { replace: true });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen auth-shell px-4 py-6 sm:p-8">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-[1.1fr_.9fr] gap-8 items-center min-h-[calc(100vh-3rem)]">
        <section className="hidden lg:block relative z-10 p-10 animate-slide-up">
          <Brand />
          <p className="mt-16 font-display text-5xl leading-[1.02] font-extrabold tracking-tight text-ink">
            Train with clarity.
            <br />
            <span className="text-accent">Progress with proof.</span>
          </p>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            A thoughtful AI coach grounded in the training science that matters
            to you.
          </p>
          <div className="mt-10 flex gap-3">
            <span className="auth-chip">Research-aware</span>
            <span className="auth-chip">Built for consistency</span>
          </div>
        </section>
        <section className="auth-card relative z-10 w-full max-w-md mx-auto animate-slide-up">
          <div className="lg:hidden mb-9">
            <Brand />
          </div>
          <p className="text-2xs font-mono font-extrabold uppercase tracking-[.16em] text-accent">
            PulseFit account
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            {isSignUp && (
              <label className="block text-sm font-bold text-ink">
                Name
                <input
                  className="auth-input mt-2"
                  value={form.name}
                  onChange={update("name")}
                  autoComplete="name"
                  placeholder="Your name"
                />
              </label>
            )}
            <label className="block text-sm font-bold text-ink">
              Email address
              <input
                type="email"
                className="auth-input mt-2"
                value={form.email}
                onChange={update("email")}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            {!isForgot && (
              <>
                <PasswordInput
                  value={form.password}
                  onChange={update("password")}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                {isSignUp && (
                  <PasswordInput
                    label="Confirm password"
                    value={form.confirmPassword}
                    onChange={update("confirmPassword")}
                    autoComplete="new-password"
                  />
                )}
              </>
            )}
            {!isSignUp && !isForgot && (
              <div className="text-right -mt-1">
                <Link to="/forgot-password" className="auth-link">
                  Forgot password?
                </Link>
              </div>
            )}
            {error && (
              <p role="alert" className="auth-alert auth-alert-error">
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="auth-alert auth-alert-success">
                {success}
              </p>
            )}
            <button disabled={loading} className="auth-submit" type="submit">
              {loading
                ? "Please wait…"
                : isForgot
                  ? "Send reset link"
                  : isSignUp
                    ? "Create account"
                    : "Sign in"}
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-muted">
            {isForgot ? (
              <>
                Remembered it?{" "}
                <Link className="auth-link" to="/login">
                  Back to sign in
                </Link>
              </>
            ) : isSignUp ? (
              <>
                Already have an account?{" "}
                <Link className="auth-link" to="/login">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to PulseFit?{" "}
                <Link className="auth-link" to="/signup">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
