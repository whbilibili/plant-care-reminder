import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { generateRandomString } from "@oslojs/crypto/random";

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  async generateVerificationToken() {
    return generateRandomString(
      {
        read(bytes: Uint8Array) {
          crypto.getRandomValues(bytes);
        },
      },
      "0123456789",
      6
    );
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "Plant Care <onboarding@resend.dev>",
      to: [email],
      subject: "重置你的密码 — 植物养护",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1f473d; margin-bottom: 8px;">重置密码</h2>
          <p style="color: #555; line-height: 1.6;">你正在重置「植物养护」的登录密码，验证码如下：</p>
          <div style="background: #f4f9f6; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 0.2em; color: #1f473d;">${token}</span>
          </div>
          <p style="color: #888; font-size: 13px;">验证码 15 分钟内有效。如果不是你本人操作，请忽略此邮件。</p>
        </div>
      `,
    });

    if (error) {
      throw new Error("Could not send password reset email");
    }
  },
});
