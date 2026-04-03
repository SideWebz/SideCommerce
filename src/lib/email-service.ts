import { Resend } from "resend";

let resendClient: Resend | null | undefined;

function getResendClient() {
  if (resendClient !== undefined) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    resendClient = null;
    return resendClient;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendTransactionalEmail({
  to,
  from,
  subject,
  text,
}: {
  to: string;
  from: string;
  subject: string;
  text: string;
}) {
  const client = getResendClient();

  if (!client) {
    return { sent: false, reason: "RESEND_API_KEY is not configured" } as const;
  }

  await client.emails.send({
    from,
    to,
    subject,
    text,
  });

  return { sent: true } as const;
}
