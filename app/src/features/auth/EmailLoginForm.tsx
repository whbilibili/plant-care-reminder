import { useAuthActions } from "@convex-dev/auth/react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";

import { FormError } from "../../components/ui/FormError";
import { Icon } from "../../components/ui/Icon";

type AuthMode = "signIn" | "signUp";

interface EmailLoginFormProps {
  onForgotPassword?: () => void;
}

function getAuthErrorMessage(error: unknown, mode: AuthMode) {
  if (!(error instanceof Error)) {
    return "操作失败，请稍后重试。";
  }

  // 未注册用户尝试登录
  if (
    error.message.includes("InvalidAccountId") ||
    error.message.includes("Could not find")
  ) {
    return mode === "signIn"
      ? "该邮箱尚未注册，请先切换到注册创建账号。"
      : "注册失败，请稍后重试。";
  }

  // 密码错误
  if (
    error.message.includes("InvalidSecret") ||
    error.message.includes("Invalid credentials")
  ) {
    return "密码不正确，请检查后重试。";
  }

  // 密码不符合要求
  if (error.message.includes("Invalid password")) {
    return "密码不符合要求：至少 8 位，需包含大小写字母和数字。";
  }

  // 邮箱已被注册
  if (error.message.includes("already exists") || error.message.includes("Account already")) {
    return "该邮箱已注册，请直接登录。";
  }

  // Convex Auth 服务端通用错误（密码错误、邮箱未注册等未被精确匹配的情况）
  if (error.message.includes("Server Error") || error.message.includes("CONVEX")) {
    return mode === "signIn"
      ? "邮箱或密码不正确，请检查后重试。"
      : "注册失败，请稍后重试。";
  }

  return error.message;
}

export function EmailLoginForm({ onForgotPassword }: EmailLoginFormProps) {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === "signIn";

  function validatePassword(pwd: string): string | null {
    if (pwd.length < 8) return "密码至少需要 8 位。";
    if (!/[a-z]/.test(pwd)) return "密码需包含至少一个小写字母。";
    if (!/[A-Z]/.test(pwd)) return "密码需包含至少一个大写字母。";
    if (!/[0-9]/.test(pwd)) return "密码需包含至少一个数字。";
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    // 注册时前端校验密码强度
    if (!isLogin) {
      const pwdError = validatePassword(password);
      if (pwdError) {
        setErrorMessage(pwdError);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const result = await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        flow: mode,
      });

      if (result.signingIn) {
        setStatusMessage(
          isLogin
            ? "登录成功，正在进入你的家庭植物看板..."
            : "注册成功，正在进入你的家庭植物看板..."
        );
      }
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, mode));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form style={formStyle} onSubmit={handleSubmit}>
      {/* Segmented control */}
      <div style={segmentedWrapper}>
        <button
          type="button"
          style={{
            ...segmentedButton,
            ...(isLogin ? segmentedButtonActive : null),
          }}
          onClick={() => {
            setMode("signIn");
            setErrorMessage(null);
          }}
        >
          登录
        </button>
        <button
          type="button"
          style={{
            ...segmentedButton,
            ...(!isLogin ? segmentedButtonActive : null),
          }}
          onClick={() => {
            setMode("signUp");
            setErrorMessage(null);
          }}
        >
          注册
        </button>
      </div>

      {/* Email field */}
      <div style={fieldWrapper}>
        <label style={fieldLabel} htmlFor="auth-email">
          <span>邮箱</span>
        </label>
        <div style={passwordInputWrap}>
          <Icon icon={Mail} size={16} colorVar="--color-muted" style={passwordLeftIcon} />
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="请输入邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...inputStyle, width: "100%", paddingLeft: "40px" }}
          />
        </div>
      </div>

      {/* Password field */}
      <div style={fieldWrapper}>
        <label style={fieldLabel} htmlFor="auth-password">
          <span>密码</span>
        </label>
        <div style={passwordInputWrap}>
          <Icon icon={Lock} size={16} colorVar="--color-muted" style={passwordLeftIcon} />
          <input
            id="auth-password"
            type={showPassword ? "text" : "password"}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={isLogin ? undefined : 8}
            placeholder={isLogin ? "请输入密码" : "至少 8 位，含大小写字母和数字"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, width: "100%", paddingLeft: "40px", paddingRight: "44px" }}
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

      {/* Remember me + Forgot password */}
      {isLogin && (
        <div style={optionsRow}>
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={checkboxInput}
            />
            <span style={checkboxText}>记住我</span>
          </label>
          <button type="button" style={forgotLink} onClick={onForgotPassword}>
            忘记密码？
          </button>
        </div>
      )}

      {/* Error / status messages */}
      {errorMessage ? <FormError message={errorMessage} /> : null}
      {statusMessage ? <p style={statusStyle}>{statusMessage}</p> : null}

      {/* Submit button */}
      <button
        disabled={isSubmitting}
        style={{
          ...buttonStyle,
          opacity: isSubmitting ? 0.72 : 1,
          cursor: isSubmitting ? "not-allowed" : "pointer",
          transform: isSubmitting ? "scale(0.98)" : "scale(1)",
        }}
        type="submit"
      >
        {isSubmitting
          ? "处理中..."
          : isLogin
            ? "登录"
            : "创建账号"}
      </button>

      {/* Divider */}
      <div style={dividerRow}>
        <span style={dividerLine} />
        <span style={dividerText}>或</span>
        <span style={dividerLine} />
      </div>

      {/* Switch mode link */}
      <div style={switchRow}>
        <button
          type="button"
          style={switchLink}
          onClick={() => {
            setMode(isLogin ? "signUp" : "signIn");
            setErrorMessage(null);
          }}
        >
          {isLogin ? "还没有账号？切换到注册 >" : "已有账号？切换到登录 >"}
        </button>
      </div>
    </form>
  );
}

/* ===== Styles ===== */

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
};

/* Segmented control */
const segmentedWrapper: React.CSSProperties = {
  display: "flex",
  padding: "3px",
  borderRadius: "var(--radius-input)",
  background: "var(--color-mist)",
  gap: "2px",
};

const segmentedButton: React.CSSProperties = {
  flex: 1,
  appearance: "none",
  border: "none",
  borderRadius: "calc(var(--radius-input) - 2px)",
  padding: "var(--space-sm) 0",
  fontSize: "0.88rem",
  fontWeight: 600,
  fontFamily: "var(--font-body)",
  color: "var(--color-muted)",
  background: "transparent",
  cursor: "pointer",
  transition: "all 200ms ease",
};

const segmentedButtonActive: React.CSSProperties = {
  background: "var(--color-paper)",
  color: "var(--color-ink)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};


/* Field */
const fieldWrapper: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
};

const fieldLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "var(--color-ink)",
};

const inputStyle: React.CSSProperties = {
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

const passwordInputWrap: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const passwordLeftIcon: React.CSSProperties = {
  position: "absolute",
  left: "14px",
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
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

/* Options row */
const optionsRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const checkboxLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  cursor: "pointer",
};

const checkboxInput: React.CSSProperties = {
  width: "16px",
  height: "16px",
  accentColor: "var(--color-leaf)",
  cursor: "pointer",
};

const checkboxText: React.CSSProperties = {
  fontSize: "0.82rem",
  color: "var(--color-ink)",
};

const forgotLink: React.CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: "0.82rem",
  color: "var(--color-leaf)",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
};

/* Status */
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

/* Submit button */
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
  transition: "transform 200ms ease, opacity 200ms ease, box-shadow 200ms ease",
};

/* Divider */
const dividerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-md)",
};

const dividerLine: React.CSSProperties = {
  flex: 1,
  height: "1px",
  background: "var(--color-line)",
};

const dividerText: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "var(--color-muted)",
};

/* Switch mode */
const switchRow: React.CSSProperties = {
  textAlign: "center",
};

const switchLink: React.CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: "0.85rem",
  color: "var(--color-leaf)",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
};
