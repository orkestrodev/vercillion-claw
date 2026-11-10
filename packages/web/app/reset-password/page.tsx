"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword, requestPasswordReset } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const queryError = searchParams.get("error");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    queryError === "INVALID_TOKEN" ? "This reset link is invalid or has expired. Please request a new one." : null
  );
  const [success, setSuccess] = useState(false);
  const [requestedNewLink, setRequestedNewLink] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is missing. Please use the link provided in your email.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword({
        newPassword,
        token,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to reset password. The link may have expired.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/");
        }, 2500);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred while resetting password.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await requestPasswordReset({
        email: email.trim(),
        redirectTo: window.location.origin + "/reset-password",
      });

      if (res?.error) {
        setError(res.error.message || "Failed to send reset link.");
      } else {
        setRequestedNewLink(true);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900/90 dark:backdrop-blur-xl">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex size-16 items-center justify-center rounded-2xl overflow-hidden border border-zinc-200/80 shadow-xl bg-zinc-900 dark:border-zinc-800">
          <img src="/logo.png" alt="Vercillion Claw" className="size-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Vercillion Claw
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Set a new password for your account.
        </p>
      </div>

      {success ? (
        <div className="mt-6 space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="size-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Password Reset Complete!
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Your password has been successfully updated. Redirecting you to sign in...
            </p>
          </div>
          <Button
            onClick={() => router.push("/")}
            className="w-full h-10 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 cursor-pointer"
          >
            Sign In Now
          </Button>
        </div>
      ) : token && !queryError ? (
        <form onSubmit={handleReset} className="mt-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              New Password
            </label>
            <Input
              type="password"
              required
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Confirm New Password
            </label>
            <Input
              type="password"
              required
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Save New Password"}
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {requestedNewLink ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                If an account exists for {email}, a fresh password reset link has been sent to your email.
              </div>
            </div>
          ) : (
            <form onSubmit={handleRequestNewLink} className="space-y-4">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Enter your email address to receive a fresh password reset link via Resend.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                <Input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Send Reset Link"}
              </Button>
            </form>
          )}

          <div className="text-center pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 p-4 dark:from-zinc-950 dark:to-black">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-emerald-600" />
            <p className="text-xs text-zinc-500">Loading...</p>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
