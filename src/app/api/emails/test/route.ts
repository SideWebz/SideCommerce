import { NextRequest, NextResponse } from "next/server";
import type { EmailTemplateType } from "@prisma/client";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getTemplateDefinition,
  renderTemplate,
  validateTemplateBody,
} from "@/lib/email-templates";
import { sendTransactionalEmail } from "@/lib/email-service";
import { buildStoreBaseUrl, buildStoreSenderAddress } from "@/lib/env-config";

function buildSampleOrderLink(domain: string) {
  const base = buildStoreBaseUrl(domain);
  return `${base}/order/test-order-123`;
}

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  if (!store) {
    return NextResponse.json({ message: "No store found" }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { type, subject, body } = (payload ?? {}) as Record<string, unknown>;

  if (typeof type !== "string" || typeof subject !== "string" || typeof body !== "string") {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  let templateDefinition;
  try {
    templateDefinition = getTemplateDefinition(type as EmailTemplateType);
  } catch {
    return NextResponse.json({ message: "Unsupported template type" }, { status: 400 });
  }

  const normalizedSubject = subject.trim();
  const normalizedBody = body.trim();

  if (!normalizedSubject || !normalizedBody) {
    return NextResponse.json({ message: "Subject and body are required" }, { status: 400 });
  }

  const { missingRequiredPlaceholders, unsupportedPlaceholders } = validateTemplateBody(
    type as EmailTemplateType,
    normalizedBody,
  );

  if (unsupportedPlaceholders.length > 0) {
    return NextResponse.json(
      { message: `Unsupported placeholders: ${unsupportedPlaceholders.join(", ")}` },
      { status: 400 },
    );
  }

  if (missingRequiredPlaceholders.length > 0) {
    return NextResponse.json(
      { message: `Missing placeholders: ${missingRequiredPlaceholders.join(", ")}` },
      { status: 400 },
    );
  }

  const renderedBody = renderTemplate(
    normalizedBody,
    {
      "[order-link]": buildSampleOrderLink(store.domain),
      "[tracking-code]": "3SABC123456789",
    },
    templateDefinition.requiredPlaceholders,
  );

  const sender = buildStoreSenderAddress(store.name);
  const sendResult = await sendTransactionalEmail({
    to: user.email,
    from: sender,
    subject: `[Test] ${normalizedSubject}`,
    text: renderedBody,
  });

  if (!sendResult.sent) {
    return NextResponse.json({ message: sendResult.reason }, { status: 503 });
  }

  return NextResponse.json({
    message: `Test email sent to ${user.email}`,
  });
});
