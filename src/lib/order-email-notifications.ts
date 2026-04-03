import type { EmailTemplateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ensureStoreEmailTemplates,
  getTemplateDefinition,
  renderTemplate,
} from "@/lib/email-templates";
import { sendTransactionalEmail } from "@/lib/email-service";
import { buildStoreBaseUrl, buildStoreSenderAddress } from "@/lib/env-config";

function buildOrderLink(domain: string, orderId: string) {
  const base = buildStoreBaseUrl(domain);
  return `${base}/order/${orderId}`;
}

async function sendOrderEmail({
  orderId,
  templateType,
}: {
  orderId: string;
  templateType: EmailTemplateType;
}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      store: true,
    },
  });

  if (!order) {
    return { sent: false, reason: "Order not found" } as const;
  }

  await ensureStoreEmailTemplates(order.storeId);

  const template = await prisma.emailTemplate.findUnique({
    where: {
      storeId_type: {
        storeId: order.storeId,
        type: templateType,
      },
    },
  });

  if (!template) {
    return { sent: false, reason: "Template not found" } as const;
  }

  const definition = getTemplateDefinition(templateType);
  const orderLink = buildOrderLink(order.store.domain, order.id);

  const text = renderTemplate(
    template.body,
    {
      "[order-link]": orderLink,
      "[tracking-code]": order.trackingCode ?? "not available",
    },
    definition.requiredPlaceholders,
  );

  const from = buildStoreSenderAddress(order.store.name);

  return sendTransactionalEmail({
    to: order.customerEmail,
    from,
    subject: template.subject,
    text,
  });
}

export async function sendOrderPlacedEmail(orderId: string) {
  return sendOrderEmail({ orderId, templateType: "ORDER_PLACED" });
}

export async function sendOrderShippedEmail(orderId: string) {
  return sendOrderEmail({ orderId, templateType: "ORDER_SHIPPED" });
}
