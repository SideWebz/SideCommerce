import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getStoreByDomain,
  isPlatformDomain,
  normalizeDomainFromHost,
} from "@/lib/storefront";
import { sendOrderPlacedEmail } from "@/lib/order-email-notifications";
import { getMollieClient } from "@/lib/mollie";
import { getAppUrl } from "@/lib/env-config";

type OrderItemInput = {
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
};

function formatStockError(itemLabel: string, availableStock: number) {
  if (availableStock <= 0) {
    return `Item ${itemLabel} is not in stock anymore.`;
  }

  return `Item ${itemLabel} only has ${availableStock} left in stock.`;
}

export async function POST(req: Request) {
  const requestHeaders = await headers();
  const domain = normalizeDomainFromHost(requestHeaders.get("host") ?? "");

  if (isPlatformDomain(domain)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const store = await getStoreByDomain(domain);
  if (!store) {
    return NextResponse.json({ message: "Store not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const {
    customerName,
    customerEmail,
    customerPhone,
    customerStreet,
    customerHouseNumber,
    customerPostalCode,
    customerCity,
    customerCountry,
    items,
  } = body as Record<string, unknown>;

  if (
    typeof customerName !== "string" || !customerName.trim() ||
    typeof customerEmail !== "string" || !customerEmail.trim() ||
    typeof customerPhone !== "string" || !customerPhone.trim() ||
    typeof customerStreet !== "string" || !customerStreet.trim() ||
    typeof customerHouseNumber !== "string" || !customerHouseNumber.trim() ||
    typeof customerPostalCode !== "string" || !customerPostalCode.trim() ||
    typeof customerCity !== "string" || !customerCity.trim() ||
    typeof customerCountry !== "string" || !customerCountry.trim()
  ) {
    return NextResponse.json({ message: "All customer fields are required" }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
  }

  // Validate each item
  for (const item of items) {
    const i = item as Record<string, unknown>;
    const qty = i.quantity as number;
    const price = i.unitPrice as number;
    if (
      typeof item !== "object" || item === null ||
      typeof i.productId !== "string" ||
      typeof i.productName !== "string" ||
      typeof qty !== "number" || qty < 1 ||
      typeof price !== "number" || price < 0
    ) {
      return NextResponse.json({ message: "Invalid cart item" }, { status: 400 });
    }
  }

  const typedItems = items as OrderItemInput[];
  const normalizedCountry = customerCountry.trim();
  const normalizedAddress = `${customerStreet.trim()} ${customerHouseNumber.trim()}, ${customerPostalCode.trim()} ${customerCity.trim()}, ${normalizedCountry}`;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const productIds = [...new Set(typedItems.map((i) => i.productId))];
      const variantIds = [...new Set(typedItems.flatMap((i) => (i.variantId ? [i.variantId] : [])))];

      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds }, storeId: store.id },
        select: {
          id: true,
          name: true,
          productType: true,
          price: true,
          stock: true,
        },
      });

      if (dbProducts.length !== productIds.length) {
        throw new Error("One or more products not found");
      }

      const dbVariants = variantIds.length > 0
        ? await tx.variant.findMany({
            where: { id: { in: variantIds }, product: { storeId: store.id } },
            select: {
              id: true,
              productId: true,
              name: true,
              price: true,
              stock: true,
            },
          })
        : [];

      if (dbVariants.length !== variantIds.length) {
        throw new Error("One or more product options are no longer available");
      }

      const productsById = new Map(dbProducts.map((product) => [product.id, product]));
      const variantsById = new Map(dbVariants.map((variant) => [variant.id, variant]));

      const orderItems = typedItems.map((item) => {
        const product = productsById.get(item.productId);
        if (!product) {
          throw new Error("One or more products not found");
        }

        if (item.variantId) {
          const variant = variantsById.get(item.variantId);
          if (!variant || variant.productId !== product.id) {
            throw new Error(`Item ${item.productName} is no longer available.`);
          }

          const itemLabel = `${product.name} - ${variant.name}`;
          if (variant.stock < item.quantity) {
            throw new Error(formatStockError(itemLabel, variant.stock));
          }

          return {
            productId: product.id,
            productName: product.name,
            variantId: variant.id,
            variantName: variant.name,
            quantity: item.quantity,
            unitPrice: Number(variant.price),
            subtotal: Number(variant.price) * item.quantity,
          };
        }

        const currentStock = product.stock ?? 0;
        if (currentStock < item.quantity) {
          throw new Error(formatStockError(product.name, currentStock));
        }

        return {
          productId: product.id,
          productName: product.name,
          variantId: null,
          variantName: null,
          quantity: item.quantity,
          unitPrice: Number(product.price ?? 0),
          subtotal: Number(product.price ?? 0) * item.quantity,
        };
      });

      for (const item of orderItems) {
        if (item.variantId) {
          const result = await tx.variant.updateMany({
            where: {
              id: item.variantId,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (result.count !== 1) {
            throw new Error(formatStockError(`${item.productName} - ${item.variantName}`, 0));
          }
        } else {
          const result = await tx.product.updateMany({
            where: {
              id: item.productId,
              storeId: store.id,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (result.count !== 1) {
            throw new Error(formatStockError(item.productName, 0));
          }
        }
      }

      const subtotalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

      const shippingRegion = await tx.shippingRegion.findFirst({
        where: {
          storeId: store.id,
          country: normalizedCountry,
        },
        select: {
          shippingCost: true,
          freeShippingFrom: true,
        },
      });

      if (!shippingRegion) {
        throw new Error("Shipping is not available for the selected country.");
      }

      const shippingCost = shippingRegion.freeShippingFrom !== null && subtotalAmount >= Number(shippingRegion.freeShippingFrom)
        ? 0
        : Number(shippingRegion.shippingCost);

      const totalAmount = subtotalAmount + shippingCost;

      return tx.order.create({
        data: {
          storeId: store.id,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          customerPhone: customerPhone.trim(),
          customerAddress: normalizedAddress,
          totalAmount,
          status: "pending",
          paymentStatus: "pending",
          items: {
            create: orderItems,
          },
        },
        select: { id: true, totalAmount: true },
      });
    });

    // Create the Mollie payment after the order is safely stored
    const requestHeaders = await headers();
    const configuredPort = (process.env.SITE_PORT ?? process.env.PORT ?? "3000").trim() || "3000";
    const host = requestHeaders.get("host") ?? `localhost:${configuredPort}`;
    const hostname = host.split(":")[0] ?? "";
    // Local / dev TLDs — never force https
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".test") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal");
    const storeBaseUrl = `${isLocalHost ? "http" : "https"}://${host}`;
    const appUrl = getAppUrl();

    // Mollie rejects webhook URLs it cannot reach (e.g. localhost).
    // Only include the webhookUrl when APP_URL is a publicly accessible address.
    const isPublicWebhookUrl =
      !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1");

    const mollie = getMollieClient();

    let mollieCheckoutUrl: string;
    try {
      const payment = await mollie.payments.create({
        amount: {
          currency: store.currency as string,
          value: Number(order.totalAmount).toFixed(2),
        },
        description: `Order #${order.id.slice(-8).toUpperCase()} – ${store.name}`,
        redirectUrl: `${storeBaseUrl}/order/${order.id}`,
        ...(isPublicWebhookUrl
          ? { webhookUrl: `${appUrl}/api/mollie/webhook` }
          : {}),
        metadata: {
          orderId: order.id,
          storeId: store.id,
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { molliePaymentId: payment.id },
      });

      const checkoutUrl = payment.getCheckoutUrl();
      if (!checkoutUrl) {
        throw new Error("Mollie did not return a checkout URL");
      }
      mollieCheckoutUrl = checkoutUrl;
    } catch (mollieError) {
      // If Mollie payment creation fails, cancel the order so stock is not permanently held
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "canceled", paymentStatus: "failed" },
      });
      console.error("Mollie payment creation failed", mollieError);
      return NextResponse.json(
        { message: "Payment provider error. Please try again." },
        { status: 502 },
      );
    }

    void sendOrderPlacedEmail(order.id).catch((error) => {
      console.error("Failed to send order placed email", error);
    });

    return NextResponse.json({
      message: "Order created",
      orderId: order.id,
      mollieCheckoutUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to place order right now";
    return NextResponse.json({ message }, { status: 400 });
  }
}
