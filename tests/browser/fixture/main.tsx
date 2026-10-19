import {EnterpriseApplication} from "@/src/components/EnterpriseApplication";
import "@/src/app/globals.css";
import {BuyerFixture} from "../buyer-fixture";
import { AuthShell } from "@/src/components/auth/AuthShell";
import { LoginForm } from "@/src/components/auth/LoginForm";
import { RegisterForm } from "@/src/components/auth/RegisterForm";
import { PasswordResetForm } from "@/src/components/auth/PasswordResetForm";
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
  if(new URLSearchParams(window.location.search).has("enterpriseComponent"))return <Providers locale="zh"><EnterpriseApplication embedded/></Providers>;
  const buyer=new URLSearchParams(window.location.search).get("buyer");
  if(buyer)return <Providers locale={new URLSearchParams(window.location.search).get("lang")==="zh"?"zh":"en"}><BuyerFixture screen={buyer}/></Providers>;
  const auth=new URLSearchParams(window.location.search).get("auth");
  if(auth)return <Providers locale="en"><AuthShell>{auth==="register"?<RegisterForm/>:auth==="forgot"?<PasswordResetForm/>:auth==="reset"?<PasswordResetForm token=""/>:<LoginForm/>}</AuthShell></Providers>;
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
