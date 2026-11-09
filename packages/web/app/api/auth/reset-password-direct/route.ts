import { NextResponse } from "next/server";
import { createClient } from "@libsql/client/web";
import { hashPassword } from "better-auth/crypto";
import { tursoUrl, tursoToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Email and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const client = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });

    const cleanEmail = String(email).trim().toLowerCase();

    const userRes = await client.execute({
      sql: "SELECT id FROM user WHERE LOWER(email) = ?",
      args: [cleanEmail],
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 }
      );
    }

    const userId = String(userRes.rows[0].id);
    const hashedPassword = await hashPassword(newPassword);

    await client.execute({
      sql: "UPDATE account SET password = ?, updatedAt = ? WHERE userId = ?",
      args: [hashedPassword, new Date().toISOString(), userId],
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now sign in with your new password.",
    });
  } catch (error: any) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reset password." },
      { status: 500 }
    );
  }
}
