"use client";

import { useState } from "react";
import { signIn, signUp, useSession, requestPasswordReset } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Lock, ShieldCheck, ArrowLeft, CheckCircle2, Mail, KeyRound } from "lucide-react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [forgotMethod, setForgotMethod] = useState<"email" | "direct">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <Sparkles className="size-6 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-zinc-500">Loading Vercillion Claw...</p>
        </div>
      </div>
    );
  }

  if (session?.user) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const res = await signIn.email({
          email: email.trim(),
          password,
        });
        if (res?.error) {
          setError(res.error.message || "Failed to sign in. Check your email and password.");
        }
      } else if (mode === "signup") {
        const res = await signUp.email({
          name: name.trim() || "User",
          email: email.trim(),
          password,
        });
        if (res?.error) {
          setError(res.error.message || "Failed to create account.");
        }
      } else if (mode === "forgot") {
        if (forgotMethod === "email") {
          const res = await requestPasswordReset({
            email: email.trim(),
            redirectTo: window.location.origin + "/reset-password",
          });

          if (res?.error) {
            setError(res.error.message || "Failed to send reset link.");
          } else {
            setSuccessMsg("Reset link sent! Please check your email inbox (and spam folder) to reset your password.");
          }
        } else {
          const res = await fetch("/api/auth/reset-password-direct", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.trim(),
              newPassword: newPassword,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Failed to reset password.");
          } else {
            setSuccessMsg("Password reset successfully! Please sign in with your new password.");
            setPassword("");
            setNewPassword("");
            setMode("signin");
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 p-4 dark:from-zinc-950 dark:to-black">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900/90 dark:backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Sparkles className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Vercillion Claw
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Sign in to access your personal autonomous assistant, persistent memory, and tools.
          </p>

          <div className="mt-4 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Lock className="size-3.5" />
            <span>Login Required</span>
          </div>
        </div>

        {mode !== "forgot" ? (
          <div className="mt-6 flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setMode("signin");
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                mode === "signin"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setMode("signup");
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                mode === "signup"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setMode("signin");
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Sign In</span>
            </button>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Reset Password
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>{successMsg}</div>
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Full Name
              </label>
              <Input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Email Address
            </label>
            <Input
              type="email"
              required
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          {mode === "forgot" ? (
            forgotMethod === "direct" ? (
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  New Password
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Enter new password (min. 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            ) : null
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMsg(null);
                      setNewPassword("");
                      setForgotMethod("email");
                      setMode("forgot");
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-md shadow-emerald-600/20 mt-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "signin" ? (
              "Sign In"
            ) : mode === "signup" ? (
              "Create Account"
            ) : forgotMethod === "email" ? (
              "Send Reset Link"
            ) : (
              "Update Password Directly"
            )}
          </Button>

          {mode === "forgot" && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  setForgotMethod(forgotMethod === "email" ? "direct" : "email");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white underline cursor-pointer"
              >
                {forgotMethod === "email"
                  ? "Don't have access to email? Reset directly"
                  : "Prefer email? Send reset link to inbox instead"}
              </button>
            </div>
          )}

          {mode !== "forgot" && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  setMode(mode === "signin" ? "signup" : "signin");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white underline cursor-pointer"
              >
                {mode === "signin"
                  ? "Don't have an account? Create one"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          )}
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-zinc-100 pt-4 text-[11px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          <span>Secured by Better Auth & Turso libSQL</span>
        </div>
      </div>
    </div>
  );
}
