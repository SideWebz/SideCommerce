import type { EmailTemplateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TemplateDefinition = {
  type: EmailTemplateType;
  label: string;
  defaultSubject: string;
  defaultBody: string;
  allowedPlaceholders: string[];
  requiredPlaceholders: string[];
};

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    type: "ORDER_PLACED",
    label: "Order Placed",
    defaultSubject: "Your order has been placed successfully",
    defaultBody: "Your order has been placed successfully. You can view your order here: [order-link]",
    allowedPlaceholders: ["[order-link]"],
    requiredPlaceholders: ["[order-link]"],
  },
  {
    type: "ORDER_SHIPPED",
    label: "Order Shipped",
    defaultSubject: "Your order has been shipped",
    defaultBody:
      "Your order has been shipped. Track your order here: [order-link]. Tracking code: [tracking-code]",
    allowedPlaceholders: ["[order-link]", "[tracking-code]"],
    requiredPlaceholders: ["[order-link]", "[tracking-code]"],
  },
];

const TEMPLATE_BY_TYPE = new Map(TEMPLATE_DEFINITIONS.map((definition) => [definition.type, definition]));

export function getTemplateDefinitions() {
  return TEMPLATE_DEFINITIONS;
}

export function getTemplateDefinition(type: EmailTemplateType) {
  const definition = TEMPLATE_BY_TYPE.get(type);
  if (!definition) {
    throw new Error(`Unsupported template type: ${type}`);
  }
  return definition;
}

export function validateTemplateBody(type: EmailTemplateType, body: string) {
  const definition = getTemplateDefinition(type);
  const missingRequiredPlaceholders = definition.requiredPlaceholders.filter(
    (placeholder) => !body.includes(placeholder),
  );

  const unsupportedPlaceholders = Array.from(body.matchAll(/\[[a-z-]+\]/gi))
    .map((match) => match[0].toLowerCase())
    .filter((placeholder) => !definition.allowedPlaceholders.includes(placeholder));

  return {
    missingRequiredPlaceholders,
    unsupportedPlaceholders,
  };
}

export async function ensureStoreEmailTemplates(storeId: string) {
  for (const definition of TEMPLATE_DEFINITIONS) {
    await prisma.emailTemplate.upsert({
      where: {
        storeId_type: {
          storeId,
          type: definition.type,
        },
      },
      create: {
        storeId,
        type: definition.type,
        subject: definition.defaultSubject,
        body: definition.defaultBody,
      },
      update: {},
    });
  }
}

export function renderTemplate(
  body: string,
  placeholders: Record<string, string>,
  requiredPlaceholders: string[],
) {
  let output = body;

  for (const [placeholder, value] of Object.entries(placeholders)) {
    output = output.replaceAll(placeholder, value);
  }

  // Resilient fallback if placeholder was removed from body.
  for (const required of requiredPlaceholders) {
    if (!body.includes(required)) {
      const fallbackValue = placeholders[required] ?? "";
      if (fallbackValue) {
        output += `\n\n${required}: ${fallbackValue}`;
      }
    }
  }

  return output;
}
