"use client";
import { Typography } from "@douyinfe/semi-ui-19";
import { IconAlertCircle } from "@douyinfe/semi-icons";
export function FormError({ message, id }: { message?: string; id?: string }) {
  return message ? (
    <div id={id} role="alert">
      <Typography.Text type="danger" icon={<IconAlertCircle />}>
        {message}
      </Typography.Text>
    </div>
  ) : null;
}
