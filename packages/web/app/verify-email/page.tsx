"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendVerificationEmail } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const callbackURL = searchParams.get("callbackURL") || "/?verified=true";
  const queryError = searchParams.get("error");

  const [loading, setLoading] = useState(Boolean(token && !queryError));
  const [error, setError] = useState<string | null>(
    queryError ? "Verification link is invalid or has expired." : null
  );
  const [success, setSuccess] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token || queryError) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function doVerify() {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!isMounted) return;

        if (res.ok || res.redirected) {
          setSuccess(true);
          setTimeout(() => {
            router.push(callbackURL);
          }, 2000);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data?.message || "Failed to verify email. The token may be expired or invalid.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || "An unexpected error occurred during verification.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    doVerify();

    return () => {
      isMounted = false;
    };
  }, [token, queryError, callbackURL, router]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setError(null);
    setResendLoading(true);

    try {
      const res = await sendVerificationEmail({
        email: resendEmail.trim(),
        callbackURL: window.location.origin + "/?verified=true",
      });

      if (res?.error) {
        setError(res.error.message || "Failed to send verification email.");
      } else {
        setResendSent(true);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send verification email.");
    } finally {
      setResendLoading(false);
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
          Account Email Verification
        </p>
      </div>

      {loading ? (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Verifying your email address...
          </p>
          <p className="text-xs text-zinc-400">
            Please wait while we confirm your credentials.
          </p>
        </div>
      ) : success ? (
        <div className="mt-6 space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="size-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Email Verified Successfully!
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Your account is now activated. Redirecting you to sign in...
            </p>
          </div>
          <Button
            onClick={() => router.push(callbackURL)}
            className="w-full h-10 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 cursor-pointer"
          >
            Continue to App
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {resendSent ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                A fresh verification link has been sent to {resendEmail} via Resend. Please check your inbox.
              </div>
            </div>
          ) : (
            <form onSubmit={handleResend} className="space-y-3.5">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Enter your email address below to receive a new account verification link.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                <Input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={resendLoading}
                className="w-full h-10 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {resendLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-4" />
                    <span>Resend Verification Email</span>
                  </span>
                )}
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

export default function VerifyEmailPage() {
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
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
