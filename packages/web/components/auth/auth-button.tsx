"use client";

import { useState } from "react";
import { signIn, signUp, signOut, useSession, requestPasswordReset, sendVerificationEmail } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, Database, Loader2, Sparkles, ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthButtonProps {
  collapsed?: boolean;
}

export function AuthButton({ collapsed = false }: AuthButtonProps) {
  const { data: session, isPending } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [forgotMethod, setForgotMethod] = useState<"email" | "direct">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleResendVerification = async () => {
    const targetEmail = unverifiedEmail || email.trim();
    if (!targetEmail) return;

    setResendingVerification(true);
    setError(null);

    try {
      const res = await sendVerificationEmail({
        email: targetEmail,
        callbackURL: window.location.origin + "/?verified=true",
      });

      if (res?.error) {
        setError(res.error.message || "Failed to resend verification email.");
      } else {
        setSuccessMsg(`Verification email resent to ${targetEmail}! Please check your inbox.`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to resend verification email.");
    } finally {
      setResendingVerification(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        setUnverifiedEmail(null);
        const res = await signIn.email({
          email: email.trim(),
          password,
        });
        if (res?.error) {
          const isUnverified =
            res.error.code === "EMAIL_NOT_VERIFIED" ||
            res.error.message?.toLowerCase().includes("not verified");
          if (isUnverified) {
            setUnverifiedEmail(email.trim());
            setError("Your email address is not verified yet. Please verify your email before signing in.");
          } else {
            setError(res.error.message || "Failed to sign in. Check your email and password.");
          }
        } else {
          setModalOpen(false);
          setEmail("");
          setPassword("");
        }
      } else if (mode === "signup") {
        setUnverifiedEmail(null);
        const res = await signUp.email({
          name: name.trim() || "User",
          email: email.trim(),
          password,
          callbackURL: window.location.origin + "/?verified=true",
        });
        if (res?.error) {
          setError(res.error.message || "Failed to create account.");
        } else {
          setUnverifiedEmail(email.trim());
          setSuccessMsg(
            `Account created! A verification email has been sent to ${email.trim()} via Resend. Please verify your email before signing in.`
          );
          setPassword("");
          setMode("signin");
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
            setSuccessMsg("Reset link sent! Please check your email inbox to reset your password.");
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

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/";
    } catch (err) {
      console.error("Sign out error:", err);
      window.location.href = "/";
    }
  };

  if (isPending) {
    return (
      <div className={cn("flex items-center gap-2 p-2", collapsed && "justify-center")}>
        <div className="size-8 rounded-full bg-zinc-200 animate-pulse dark:bg-zinc-800" />
      </div>
    );
  }

  // Logged-in state
  if (session?.user) {
    const userInitial = (session.user.name || session.user.email || "U")
      .charAt(0)
      .toUpperCase();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl p-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer outline-none",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
            {userInitial}
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden text-xs">
              <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                {session.user.name || "User"}
              </span>
              <span className="truncate text-zinc-500 dark:text-zinc-400">
                {session.user.email}
              </span>
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={collapsed ? "end" : "start"}
          side={collapsed ? "bottom" : "top"}
          className="w-56"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{session.user.name || "User"}</p>
              <p className="text-xs leading-none text-zinc-500">{session.user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/30 cursor-pointer"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 size-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Logged-out state
  return (
    <>
      <Button
        variant="ghost"
        size={collapsed ? "icon" : "default"}
        onClick={() => {
          setError(null);
          setSuccessMsg(null);
          setMode("signin");
          setModalOpen(true);
        }}
        className={cn(
          "w-full justify-start gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
          collapsed ? "size-9 justify-center p-0" : "px-3 py-2 text-sm"
        )}
      >
        <LogIn className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        {!collapsed && <span>Sign In</span>}
      </Button>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl overflow-hidden border border-zinc-200/80 shadow-md bg-zinc-900 dark:border-zinc-800">
              <img src="/logo.png" alt="Vercillion Claw" className="size-full object-cover" />
            </div>
            <DialogTitle className="text-center text-xl">
              {mode === "signin"
                ? "Welcome Back"
                : mode === "signup"
                ? "Create Account"
                : "Reset Password"}
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Powered by Better Auth & Turso Database
            </DialogDescription>
          </DialogHeader>

          {mode === "forgot" && (
            <div className="flex items-center justify-start pb-1">
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
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            {error && (
              <div className="rounded-lg bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                <div>{error}</div>
                {unverifiedEmail && (
                  <button
                    type="button"
                    disabled={resendingVerification}
                    onClick={handleResendVerification}
                    className="mt-2 inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
                  >
                    {resendingVerification ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        <span>Sending link...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="size-3" />
                        <span>Resend verification email to {unverifiedEmail}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {successMsg && (
              <div className="flex flex-col gap-1 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
                  <div>{successMsg}</div>
                </div>
                {unverifiedEmail && (
                  <button
                    type="button"
                    disabled={resendingVerification}
                    onClick={handleResendVerification}
                    className="mt-1 ml-6 self-start inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 underline cursor-pointer"
                  >
                    {resendingVerification ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        <span>Resending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="size-3" />
                        <span>Didn't receive email? Resend</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Full Name
                </label>
                <Input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Email Address
              </label>
              <Input
                type="email"
                required
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {mode === "forgot" ? (
              forgotMethod === "direct" ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    New Password
                  </label>
                  <Input
                    type="password"
                    required
                    placeholder="Enter new password (min. 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              ) : null
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
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
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium mt-2 cursor-pointer"
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
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline cursor-pointer"
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
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline cursor-pointer"
                >
                  {mode === "signin"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
