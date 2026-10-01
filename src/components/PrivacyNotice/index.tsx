"use client";
import type { ReactNode } from "react";
import { Modal } from "@/src/components/Modal";
import { Button } from "@/src/components/Button";
import { useFoundation } from "@/src/components/Providers";
export function PrivacyNotice({
  open,
  title,
  children,
  onReject,
  onAccept,
}: {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  onReject: () => void;
  onAccept: () => void;
}) {
  const { copy } = useFoundation();
  return (
    <Modal
      open={open}
      title={title}
      onClose={onReject}
      closable={false}
      maskClosable={false}
      closeOnEsc={false}
      footer={
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            gap: 12,
          }}
        >
          <Button
            style={{ width: "100%", margin: 0, minWidth: 0 }}
            variant="outline"
            onClick={onReject}
          >
            {copy.cancel}
          </Button>
          <Button
            style={{ width: "100%", margin: 0, minWidth: 0 }}
            variant="outline"
            onClick={onAccept}
          >
            {copy.confirm}
          </Button>
        </div>
      }
    >
      {children}
    </Modal>
  );
}
