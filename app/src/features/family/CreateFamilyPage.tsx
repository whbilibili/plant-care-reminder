import { Copy, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { navigate } from "../../app/router";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import {
  clearCreateFamilySuccess,
  markCreateFamilySuccess,
} from "./createFamilySuccess";
import { CreateFamilyForm } from "./CreateFamilyForm";

interface CreateFamilyResult {
  familyId: string;
  inviteCode: string;
}

export function CreateFamilyPage() {
  const [createdFamily, setCreatedFamily] = useState<CreateFamilyResult | null>(null);

  function handleSuccess(result: CreateFamilyResult) {
    markCreateFamilySuccess();
    setCreatedFamily(result);
  }

  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!createdFamily) return;
    try {
      await navigator.clipboard.writeText(createdFamily.inviteCode);
      setCopied(true);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 1500);
    } catch {
      // 剪贴板不可用时静默失败，用户可手动长按复制
    }
  }, [createdFamily]);

  function goToPlantBoard() {
    clearCreateFamilySuccess();
    navigate("/plants");
  }

  if (createdFamily) {
    return (
      <section style={cardStyle}>
        <header style={headerStyle}>
          <p style={eyebrowStyle}>创建完成</p>
          <h1 style={titleStyle}>家庭创建成功</h1>
          <p style={bodyStyle}>
            把邀请码发给家人，他们就能加入你的家庭
          </p>
        </header>
        <div style={inviteCardStyle}>
          <p style={inviteLabelStyle}>邀请码</p>
          <p style={inviteCodeStyle}>{createdFamily.inviteCode}</p>
          <p style={inviteHintStyle}>
            记下邀请码，家人加入时需要用到
          </p>
          <button
            type="button"
            onClick={() => void handleCopy()}
            style={copied ? copyBtnCopiedStyle : copyBtnStyle}
            aria-label="复制邀请码"
          >
            <Icon
              icon={copied ? Check : Copy}
              size={15}
              strokeWidth={2}
              style={{ color: copied ? "var(--color-surface)" : "var(--color-leaf)" }}
            />
            {copied ? "已复制" : "复制邀请码"}
          </button>
        </div>
        <Button type="button" onClick={goToPlantBoard} style={leafButtonStyle}>
          开始使用
        </Button>
      </section>
    );
  }

  return (
    <section style={cardStyle}>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>创建家庭</p>
        <h1 style={titleStyle}>创建新家庭</h1>
        <p style={bodyStyle}>
          创建后会生成邀请码，方便你邀请家人加入
        </p>
      </header>
      <CreateFamilyForm onSuccess={handleSuccess} />
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

const inviteCardStyle: React.CSSProperties = {
  borderRadius: "var(--radius-card)",
  padding: "var(--space-lg) var(--space-md)",
  background: "var(--color-mist)",
  border: "1px solid var(--color-line)",
  display: "grid",
  gap: "var(--space-sm)",
  textAlign: "center",
};

const inviteLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-leaf)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: 700,
  fontSize: "0.76rem",
};

const inviteCodeStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  color: "var(--color-leaf)",
  fontSize: "28px",
  lineHeight: 1.1,
  fontWeight: 700,
  letterSpacing: "0.12em",
};

const inviteHintStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "0.9rem",
  lineHeight: 1.6,
};

/** 复制按钮：轻量文字按钮。 */
const copyBtnBaseStyle: React.CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  margin: "var(--space-xs) auto 0",
  padding: "8px 20px",
  borderRadius: "var(--radius-button)",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 160ms ease, color 160ms ease",
};

const copyBtnStyle: React.CSSProperties = {
  ...copyBtnBaseStyle,
  background: "transparent",
  border: "1px solid var(--color-line)",
  color: "var(--color-leaf)",
};

const copyBtnCopiedStyle: React.CSSProperties = {
  ...copyBtnBaseStyle,
  background: "var(--color-leaf)",
  border: "1px solid var(--color-leaf)",
  color: "#fff",
};

/** Onboarding 主按钮：深绿底白字。 */
const leafButtonStyle: React.CSSProperties = {
  background: "var(--color-leaf)",
  color: "#fff",
};
