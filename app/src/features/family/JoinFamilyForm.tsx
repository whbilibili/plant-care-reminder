import { useMutation } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { InputField } from "../../components/ui/InputField";
import { friendlyError } from "./friendlyError";

interface JoinFamilyFormProps {
  onSuccess: () => void;
}

export function JoinFamilyForm({ onSuccess }: JoinFamilyFormProps) {
  const joinFamilyByInviteCode = useMutation(api.families.joinFamilyByInviteCode);
  const [inviteCode, setInviteCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await joinFamilyByInviteCode({ inviteCode });
      onSuccess();
    } catch (error) {
      setErrorMessage(friendlyError(error, "加入家庭失败，请检查邀请码后重试"));
      setIsSubmitting(false);
    }
  }

  return (
    <form style={formStyle} onSubmit={handleSubmit}>
      <InputField
        autoCapitalize="characters"
        autoComplete="off"
        hint="找家人要一下 6 位邀请码"
        label="邀请码"
        maxLength={12}
        onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
        placeholder="ABCD12"
        required
        value={inviteCode}
      />
      <FormError message={errorMessage} />
      <Button disabled={isSubmitting} style={leafButtonStyle} type="submit">
        {isSubmitting ? "加入中..." : "加入家庭"}
      </Button>
    </form>
  );
}

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
};

/** Onboarding 主按钮：深绿底白字，对齐设计稿。 */
const leafButtonStyle: React.CSSProperties = {
  background: "var(--color-leaf)",
  color: "#fff",
};
