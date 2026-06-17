import { useMutation } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import { ConfirmSheet } from "../../components/ui/ConfirmSheet";
import { InputField } from "../../components/ui/InputField";

const FAMILY_NAME_MAX_LENGTH = 20;

interface FamilyNameEditSheetProps {
  /** 当前家庭名，作为编辑初始值。 */
  currentName: string;
  /** 关闭 sheet（取消或保存成功后）。 */
  onClose: () => void;
}

/**
 * 家庭名编辑 sheet（SET3-002）。克隆 NicknameEditSheet 的结构与视觉，
 * 写入逻辑改为 families.renameFamily（admin-only，后端二次校验），
 * 保留非空 + maxLength 20 校验。非破坏性、无二次确认。
 */
export function FamilyNameEditSheet({
  currentName,
  onClose,
}: FamilyNameEditSheetProps) {
  const renameFamily = useMutation(api.families.renameFamily);
  const [name, setName] = useState(currentName);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setErrorMessage("家庭名不能为空。");
      return;
    }
    if (trimmed.length > FAMILY_NAME_MAX_LENGTH) {
      setErrorMessage(`家庭名最多 ${FAMILY_NAME_MAX_LENGTH} 个字符。`);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await renameFamily({ name: trimmed });
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "保存家庭名失败，请稍后再试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ConfirmSheet
      ariaLabel="编辑家庭名"
      cancelLabel="取消"
      confirmLabel={isSubmitting ? "保存中…" : "保存"}
      isSubmitting={isSubmitting}
      onCancel={onClose}
      onConfirm={() => void handleConfirm()}
      title="修改家庭名"
      variant="primary"
    >
      <InputField
        errorMessage={errorMessage}
        hint="让家人一眼认出这个家庭，例如「向阳花园」。"
        label="家庭名"
        maxLength={FAMILY_NAME_MAX_LENGTH}
        onChange={(event) => setName(event.target.value)}
        placeholder="例如：向阳花园"
        value={name}
      />
    </ConfirmSheet>
  );
}
