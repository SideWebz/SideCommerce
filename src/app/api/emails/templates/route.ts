import { NextRequest, NextResponse } from "next/server";
import type { EmailTemplateType } from "@prisma/client";
import { withDatabaseFallback } from "@/lib/api-db-fallback";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureStoreEmailTemplates,
  getTemplateDefinition,
  getTemplateDefinitions,
  validateTemplateBody,
} from "@/lib/email-templates";

export const GET = withDatabaseFallback(async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  if (!store) {
    return NextResponse.json({ message: "No store found" }, { status: 404 });
  }

  await ensureStoreEmailTemplates(store.id);

  const templates = await prisma.emailTemplate.findMany({
    where: { storeId: store.id },
    orderBy: { type: "asc" },
  });

  const definitions = getTemplateDefinitions();

  return NextResponse.json({
    message: "Email templates fetched",
    templates: definitions.map((definition) => {
      const template = templates.find((row) => row.type === definition.type);
      return {
        type: definition.type,
        label: definition.label,
        subject: template?.subject ?? definition.defaultSubject,
        body: template?.body ?? definition.defaultBody,
        allowedPlaceholders: definition.allowedPlaceholders,
        requiredPlaceholders: definition.requiredPlaceholders,
      };
    }),
  });
});

export const POST = withDatabaseFallback(async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized", redirectTo: "/login" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({ where: { userId: user.id } });
  if (!store) {
    return NextResponse.json({ message: "No store found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { type, subject, body: templateBody } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof type !== "string" ||
    typeof subject !== "string" ||
    typeof templateBody !== "string"
  ) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  try {
    getTemplateDefinition(type as EmailTemplateType);
  } catch {
    return NextResponse.json({ message: "Unsupported template type" }, { status: 400 });
  }

  const normalizedSubject = subject.trim();
  const normalizedBody = templateBody.trim();

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

  await prisma.emailTemplate.upsert({
    where: {
      storeId_type: {
        storeId: store.id,
        type: type as EmailTemplateType,
      },
    },
    create: {
      storeId: store.id,
      type: type as EmailTemplateType,
      subject: normalizedSubject,
      body: normalizedBody,
    },
    update: {
      subject: normalizedSubject,
      body: normalizedBody,
    },
  });

  return NextResponse.json({ message: "Email template saved" });
});
