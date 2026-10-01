import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "@/src/components/Providers";
import { StatusState } from "@/src/components/StatusState";
import { PrivacyNotice } from "@/src/components/PrivacyNotice";
import { Modal } from "@/src/components/Modal";
import { Button } from "@/src/components/Button";
import "@/src/styles/tokens.css";
import "@/src/styles/semi-theme.css";
function Fixture() {
  const [modal, setModal] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <Providers locale="en">
      <main style={{ maxWidth: 800, margin: "auto", padding: 24 }}>
        <Button onClick={() => setModal(true)}>Open dialog</Button>
        <Button onClick={() => setPrivacy(true)}>Privacy</Button>
        <Modal open={modal} onClose={() => setModal(false)} title="Details">
          Readable content
        </Modal>
        <PrivacyNotice
          open={privacy}
          title="Privacy notice"
          onReject={() => setPrivacy(false)}
          onAccept={() => setPrivacy(false)}
        >
          <p>Your email is used to reply to you.</p>
        </PrivacyNotice>
        <StatusState
          kind="error"
          locale="en"
          onRetry={() => setCount((v) => v + 1)}
        />
        <output aria-label="Retries">{count}</output>
      </main>
    </Providers>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
