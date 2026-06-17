import { useState } from "react";

import { JoinFamilyForm } from "./JoinFamilyForm";

export function JoinFamilyPage() {
  const [isWaitingForRedirect, setIsWaitingForRedirect] = useState(false);

  if (isWaitingForRedirect) {
    return (
      <section style={cardStyle}>
        <header style={headerStyle}>
          <p style={eyebrowStyle}>正在加入</p>
          <h1 style={titleStyle}>正在接入家庭植物看板...</h1>
          <p style={bodyStyle}>
            邀请码已验证通过，正在同步家庭植物资料并带你进入共享看板。
          </p>
        </header>
      </section>
    );
  }

  return (
    <section style={cardStyle}>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>加入家庭</p>
        <h1 style={titleStyle}>加入已有家庭</h1>
        <p style={bodyStyle}>
          输入邀请码，即可和家人一起管理植物
        </p>
      </header>
      <JoinFamilyForm onSuccess={() => setIsWaitingForRedirect(true)} />
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
