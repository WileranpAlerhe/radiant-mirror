import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { streetpaysCreatePayment, streetpaysFindPayment } from "./streetpays.server";

const itemSchema = z.object({
  name: z.string().min(1),
  price: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const createPixSchema = z.object({
  description: z.string().min(1).max(200),
  items: z.array(itemSchema).min(1).max(10),
  payer: z.object({
    name: z.string().min(2).max(120),
    taxId: z.string().min(11).max(18),
    email: z.string().optional().default(""),
    phone: z.string().min(8).max(20),
  }),

  delivery: z.object({
    fee: z.number().int().min(0),
    address: z.object({
      country: z.string().default("BR"),
      state: z.string().min(2),
      city: z.string().min(1),
      district: z.string().min(1),
      street: z.string().min(1),
      number: z.string().min(1),
      complement: z.string().optional().default(""),
      zipCode: z.string().min(8),
    }),
  }),
});

export const createPixPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createPixSchema.parse(data))
  .handler(async ({ data }) => {
    const amount = data.items.reduce((total, item) => total + item.price * item.quantity, 0);
    const taxId = data.payer.taxId.replace(/\D/g, "");
    const email = /^\S+@\S+\.\S+$/.test(data.payer.email)
      ? data.payer.email
      : `cliente${taxId}@pizzariadogordo.com`;

    const payment = (await streetpaysCreatePayment({
      amount,
      currency: "BRL",
      method: "PIX",
      description: data.description,
      externalRef: `pedido_${Date.now()}`,
      payer: {
        name: data.payer.name.trim(),
        taxId,
        email,
        phone: data.payer.phone.replace(/\D/g, ""),
      },
      items: data.items.map((item) => ({ ...item, type: "PHYSICAL" })),
      delivery: {
        fee: data.delivery.fee,
        address: { ...data.delivery.address, zipCode: data.delivery.address.zipCode.replace(/\D/g, "") },
      },
    })) as {

      id: string;
      amount: number;
      status: string;
      data?: { copypaste?: string };
      createdAt?: string;
    };

    return {
      id: payment.id,
      amount: payment.amount ?? amount,
      status: payment.status,
      copypaste: payment.data?.copypaste ?? "",
      createdAt: payment.createdAt ?? new Date().toISOString(),
    };
  });

export const getPixPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().min(3).max(120) }).parse(data))
  .handler(async ({ data }) => {
    const payment = (await streetpaysFindPayment(data.id)) as { id: string; status: string };
    return { id: payment.id, status: payment.status };
  });
