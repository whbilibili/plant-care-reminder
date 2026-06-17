import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import { useState } from "react";

import { FormError } from "../../components/ui/FormError";
import { Icon } from "../../components/ui/Icon";

type Step = "request" | "verify";

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        flow: "reset",
      });
      setStatusMessage("验证码已发送到你的邮箱，请查收。");
      setStep("verify");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message.includes("Could not find")
            ? "未找到该邮箱对应的账号，请检查后重试。"
            : error.message.includes("Server Error") || error.message.includes("CONVEX")
              ? "发送验证码失败，请检查邮箱后重试。"
              : error.message
          : "发送失败，请稍后重试。"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyReset(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
        flow: "reset-verification",
      });
      setStatusMessage("密码重置成功！正在返回登录...");
      setTimeout(() => onBack(), 1500);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Invalid password")) {
          setErrorMessage("密码不符合要求：至少 8 位，需包含大小写字母和数字。");
        } else if (error.message.includes("Invalid")) {
          setErrorMessage("验证码无效或已过期，请重新获取。");
        } else if (error.message.includes("Server Error") || error.message.includes("CONVEX")) {
          setErrorMessage("重置密码失败，请稍后重试。");
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("重置失败，请稍后重试。");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <button type="button" style={backButton} onClick={onBack}>
        <Icon icon={ArrowLeft} size={20} colorVar="--color-ink" />
        <span>返回登录</span>
      </button>

      <h2 style={titleStyle}>重置密码</h2>
      <p style={subtitleStyle}>
        {step === "request"
          ? "输入注册时使用的邮箱，我们将发送验证码。"
          : "请输入邮箱中收到的验证码和新密码。"}
      </p>

      {step === "request" ? (
        <form style={formStyle} onSubmit={handleRequestReset}>
          <div style={fieldWrapper}>
            <label style={fieldLabel} htmlFor="reset-email">
              邮箱
            </label>
            <div style={inputWrap}>
              <Icon icon={Mail} size={16} colorVar="--color-muted" style={leftIcon} />
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                placeholder="请输入注册邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ ...inputStyle, paddingLeft: "40px" }}
              />
            </div>
          </div>

          {errorMessage ? <FormError message={errorMessage} /> : null}
          {statusMessage ? <p style={statusStyle}>{statusMessage}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...buttonStyle,
              opacity: isSubmitting ? 0.72 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "发送中..." : "发送验证码"}
          </button>
        </form>
      ) : (
        <form style={formStyle} onSubmit={handleVerifyReset}>
          <div style={fieldWrapper}>
            <label style={fieldLabel} htmlFor="reset-code">
              验证码
            </label>
            <div style={inputWrap}>
              <Icon icon={KeyRound} size={16} colorVar="--color-muted" style={leftIcon} />
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                placeholder="输入 6 位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ ...inputStyle, paddingLeft: "40px", letterSpacing: "0.15em" }}
              />
            </div>
          </div>

          <div style={fieldWrapper}>
            <label style={fieldLabel} htmlFor="reset-new-password">
              新密码
            </label>
            <div style={inputWrap}>
              <Icon icon={Lock} size={16} colorVar="--color-muted" style={leftIcon} />
              <input
                id="reset-new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="至少 8 位，含大小写字母和数字"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ ...inputStyle, paddingLeft: "40px", paddingRight: "44px" }}
              />
              <button
                type="button"
                style={eyeToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                <Icon
                  icon={showPassword ? EyeOff : Eye}
                  size={18}
                  colorVar="--color-muted"
                />
              </button>
            </div>
          </div>

          {errorMessage ? <FormError message={errorMessage} /> : null}
          {statusMessage ? <p style={statusStyle}>{statusMessage}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...buttonStyle,
              opacity: isSubmitting ? 0.72 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "重置中..." : "确认重置"}
          </button>

          <button
            type="button"
            style={resendLink}
            onClick={() => {
              setStep("request");
              setErrorMessage(null);
              setStatusMessage(null);
              setCode("");
              setNewPassword("");
            }}
          >
            没收到验证码？重新发送
          </button>
        </form>
      )}
    </div>
  );
}

/* ===== Styles ===== */

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
};

const backButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: "0.88rem",
  fontWeight: 500,
  color: "var(--color-ink)",
  cursor: "pointer",
  fontFamily: "var(--font-body)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "1.3rem",
  fontWeight: 700,
  color: "var(--color-ink)",
  lineHeight: 1.3,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.85rem",
  color: "var(--color-muted)",
  lineHeight: 1.5,
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  marginTop: "var(--space-sm)",
};

const fieldWrapper: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
};

const fieldLabel: React.CSSProperties = {
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "var(--color-ink)",
};

const inputWrap: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const leftIcon: React.CSSProperties = {
  position: "absolute",
  left: "14px",
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "46px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  color: "var(--color-ink)",
  padding: "0 14px",
  fontSize: "0.9rem",
  fontFamily: "var(--font-body)",
  outline: "none",
  transition: "border-color 200ms ease, box-shadow 200ms ease",
};

const eyeToggle: React.CSSProperties = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: "4px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const buttonStyle: React.CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: "48px",
  marginTop: "var(--space-xs)",
  borderRadius: "var(--radius-button)",
  border: "none",
  background: "var(--color-leaf)",
  color: "#ffffff",
  fontSize: "0.95rem",
  fontWeight: 600,
  fontFamily: "var(--font-body)",
  letterSpacing: "0.02em",
  boxShadow: "0 4px 14px rgba(31, 71, 61, 0.18)",
  transition: "transform 200ms ease, opacity 200ms ease",
};

const statusStyle: React.CSSProperties = {
  margin: 0,
  padding: "var(--space-sm) var(--space-md)",
  borderRadius: "var(--radius-input)",
  background: "rgba(47, 133, 90, 0.08)",
  color: "var(--color-success)",
  fontSize: "0.85rem",
  lineHeight: 1.5,
  textAlign: "center",
};

const resendLink: React.CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: "0.85rem",
  color: "var(--color-leaf)",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  textAlign: "center",
};
