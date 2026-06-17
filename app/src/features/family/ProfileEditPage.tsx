import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import type { CSSProperties } from "react";

import { Mail } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { GroupedSurface } from "../../components/ui/GroupedSurface";
import { Icon } from "../../components/ui/Icon";
import { InputField } from "../../components/ui/InputField";
import { ScreenNav } from "../../components/ui/ScreenNav";
import { navigate } from "../../app/router";
import { AvatarUploadField } from "./AvatarUploadField";
import type { StorageId } from "../../types/domain";

const DISPLAY_NAME_MAX_LENGTH = 20;

/**
 * ProfileEditPage — 个人资料编辑（二级页面）。
 *
 * 入口：设置页右上角头像 > 按钮。
 * 功能：修改头像（AvatarUploadField，即时保存）+ 修改家庭内显示名称。
 * 头像上传是即时保存的（AvatarUploadField 内部直接调 updateMyAvatar），
 * 名称修改需要点击"保存"按钮。
 */
export function ProfileEditPage() {
  const summary = useQuery(api.families.getFamilySettingsSummary, {});
  const updateMyProfile = useMutation(api.users.updateMyProfile);

  const currentMember = summary?.members.find((m) => m.isCurrentUser);
  const currentName = currentMember?.displayName ?? "";
  const currentImageStorageId = (currentMember?.imageStorageId ?? null) as StorageId | null;
  const myEmail = summary?.myEmail ?? null;

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  // 用户编辑过才用本地值，否则跟随后端
  const nameValue = displayName ?? currentName;

  function handleBack() {
    navigate("/settings");
  }

  async function handleSave() {
    const trimmed = nameValue.trim();
    if (trimmed.length === 0) {
      setErrorMessage("称呼不能为空。");
      return;
    }
    if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
      setErrorMessage(`称呼最多 ${DISPLAY_NAME_MAX_LENGTH} 个字符。`);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await updateMyProfile({ displayName: trimmed });
      setSaved(true);
      setTimeout(() => navigate("/settings"), 600);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "保存失败，请稍后再试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (summary === undefined) {
    return (
      <section style={pageStyle}>
        <ScreenNav title="个人资料" onBack={handleBack} />
        <p style={loadingStyle}>加载中…</p>
      </section>
    );
  }

  return (
    <section style={pageStyle}>
      <ScreenNav title="个人资料" onBack={handleBack} />

      <div style={contentStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>编辑自己</h1>
          <p style={descStyle}>头像和称呼会展示给同一个家庭里的成员。</p>
        </div>

        {/* 头像上传（即时保存） */}
        <GroupedSurface>
          <div style={avatarSectionStyle}>
            <AvatarUploadField
              imageStorageId={currentImageStorageId}
              displayName={currentName || "我"}
            />
          </div>
        </GroupedSurface>

        {/* 名称编辑 */}
        <GroupedSurface>
          <div style={nameSectionStyle}>
            <InputField
              errorMessage={errorMessage}
              hint={`最多 ${DISPLAY_NAME_MAX_LENGTH} 个字，建议使用家人熟悉的称呼。`}
              label="家庭内显示名称"
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setSaved(false);
              }}
              placeholder="例如：小王"
              value={nameValue}
            />
          </div>
        </GroupedSurface>

        {/* 登录账号（只读） */}
        <GroupedSurface>
          <div style={accountSectionStyle}>
            <div style={accountRowStyle}>
              <Icon icon={Mail} size={18} colorVar="--color-muted" />
              <div style={accountTextGroupStyle}>
                <span style={accountLabelStyle}>登录账号</span>
                <span style={accountValueStyle}>
                  {myEmail ?? "未知"}
                </span>
              </div>
            </div>
          </div>
        </GroupedSurface>

        {/* 操作按钮 */}
        <div style={actionsStyle}>
          <button
            disabled={isSubmitting}
            onClick={() => void handleSave()}
            style={primaryButtonStyle}
            type="button"
          >
            {isSubmitting ? "保存中…" : saved ? "已保存" : "保存个人资料"}
          </button>

          <button
            disabled={isSubmitting}
            onClick={handleBack}
            style={cancelButtonStyle}
            type="button"
          >
            取消
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── Styles ─── */

const pageStyle: CSSProperties = {
  display: "grid",
  gap: "0",
};

const contentStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-md)",
  paddingBottom: "80px",
};

const headerStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-xs)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "20px",
  fontWeight: 700,
  color: "var(--color-ink)",
  lineHeight: 1.3,
};

const descStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "var(--color-muted)",
  lineHeight: 1.5,
};

const avatarSectionStyle: CSSProperties = {
  padding: "var(--space-md)",
};

const nameSectionStyle: CSSProperties = {
  padding: "var(--space-md)",
};

const actionsStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-sm)",
  marginTop: "var(--space-sm)",
};

const primaryButtonStyle: CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: "48px",
  borderRadius: "var(--radius-button)",
  border: "none",
  background: "var(--color-leaf)",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
};

const cancelButtonStyle: CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: "48px",
  borderRadius: "var(--radius-button)",
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  color: "var(--color-ink)",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
};

const accountSectionStyle: CSSProperties = {
  padding: "var(--space-md)",
};

const accountRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
};

const accountTextGroupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
};

const accountLabelStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  lineHeight: 1.3,
};

const accountValueStyle: CSSProperties = {
  fontSize: "14px",
  color: "var(--color-ink)",
  lineHeight: 1.4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const loadingStyle: CSSProperties = {
  textAlign: "center",
  color: "var(--color-muted)",
  fontSize: "14px",
  padding: "var(--space-lg)",
};
