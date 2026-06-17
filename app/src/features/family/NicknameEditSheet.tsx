import { useMutation } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import { ConfirmSheet } from "../../components/ui/ConfirmSheet";
import { InputField } from "../../components/ui/InputField";

interface NicknameEditSheetProps {
  /** 当前称呼，作为编辑初始值。 */
  currentName: string;
  /** 关闭 sheet（取消或保存成功后）。 */
  onClose: () => void;
}

/**
 * 称呼编辑 sheet（SET2-009）。复用通用 ConfirmSheet 的底部 sheet 骨架，
 * 内嵌一个轻量编辑表单，写入逻辑复用 users.updateMyProfile（与 onboarding 一致），
 * 保留非空 + maxLength 40 校验。
 */
export function NicknameEditSheet({
  currentName,
  onClose,
}: NicknameEditSheetProps) {
  const updateMyProfile = useMutation(api.users.updateMyProfile);
  const [displayName, setDisplayName] = useState(currentName);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      setErrorMessage("称呼不能为空。");
      return;
    }
    if (trimmed.length > 40) {
      setErrorMessage("称呼最多 40 个字符。");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await updateMyProfile({ displayName: trimmed });
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "保存称呼失败，请稍后再试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ConfirmSheet
      ariaLabel="编辑我的称呼"
      cancelLabel="取消"
      confirmLabel={isSubmitting ? "保存中…" : "保存"}
      isSubmitting={isSubmitting}
      onCancel={onClose}
      onConfirm={() => void handleConfirm()}
      title="修改我的称呼"
      variant="primary"
    >
      <InputField
        autoComplete="nickname"
        errorMessage={errorMessage}
        hint="尽量简短，方便家人快速识别。"
        label="你的称呼"
        maxLength={40}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="例如：小王"
        value={displayName}
      />
    </ConfirmSheet>
  );
}
