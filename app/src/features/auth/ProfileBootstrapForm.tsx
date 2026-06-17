import { useMutation } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import { navigate } from "../../app/router";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { InputField } from "../../components/ui/InputField";

interface ProfileBootstrapFormProps {
  suggestedName?: string | null;
}

export function ProfileBootstrapForm({ suggestedName }: ProfileBootstrapFormProps) {
  const updateMyProfile = useMutation(api.users.updateMyProfile);
  const [displayName, setDisplayName] = useState(suggestedName?.trim() ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await updateMyProfile({
        displayName,
      });
      // 保存成功后主动跳转到家庭选择页，不再依赖 RouteGate 重定向。
      navigate("/onboarding", true);
      return;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "保存称呼失败，请稍后再试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section style={cardStyle}>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>个人资料</p>
        <h1 style={titleStyle}>家人该怎么称呼你？</h1>
        <p style={bodyStyle}>
          先保存一个简短称呼，它会出现在任务记录、家庭成员列表和养护历史中。
        </p>
      </header>
      <form style={formStyle} onSubmit={handleSubmit}>
        <InputField
          autoComplete="nickname"
          hint="尽量简短，方便家人快速识别。"
          label="你的称呼"
          maxLength={40}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="例如：小王"
          required
          value={displayName}
        />
        <FormError message={errorMessage} />
        <Button disabled={isSubmitting} style={leafButtonStyle} type="submit">
          {isSubmitting ? "保存中..." : "继续"}
        </Button>
      </form>
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  borderRadius: "var(--radius-card)",
  padding: "var(--space-lg)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  display: "grid",
  gap: "var(--space-lg)",
};

const headerStyle: React.CSSProperties = {
  maxHeight: "120px",
  display: "grid",
  gap: "var(--space-sm)",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-leaf)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: "0.75rem",
  fontWeight: 700,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "1.5rem",
  lineHeight: 1.25,
  fontWeight: 700,
  color: "var(--color-ink)",
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "0.95rem",
  lineHeight: 1.6,
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-md)",
};

/** Onboarding 主按钮：深绿底白字，对齐设计稿。 */
const leafButtonStyle: React.CSSProperties = {
  background: "var(--color-leaf)",
  color: "#fff",
};
