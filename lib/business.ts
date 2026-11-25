import { z } from "zod";
import type { Item, Order, Schedule, Slot, Status, Role } from "./types";
export class BusinessError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        qty: z.number().int().min(1).max(20),
        price: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .max(50),
  slot: z.string().max(80),
  payment: z.enum(["cash", "card"]),
  comment: z.string().max(500).default(""),
  key: z.string().uuid(),
});
export const defaultSchedule: Schedule = {
  open: 540,
  close: 960,
  saturdayClose: 780,
  duration: 15,
  capacity: 12,
  portionCapacity: 48,
  maxOrderPortions: 12,
  lead: 10,
  closed: false,
  closedDates: [],
};
export const scheduleSchema = z
  .object({
    open: z.number().int().min(0).max(1439),
    close: z.number().int().min(1).max(1440),
    saturdayClose: z.number().int().min(1).max(1440),
    duration: z.number().int().min(5).max(60),
    capacity: z.number().int().min(1).max(100),
    portionCapacity: z.number().int().min(1).max(1000).default(48),
    maxOrderPortions: z.number().int().min(1).max(100).default(12),
    lead: z.number().int().min(0).max(180),
    closed: z.boolean(),
    closedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(50),
  })
  .refine(
    (s) =>
      s.close > s.open &&
      s.saturdayClose > s.open &&
      s.maxOrderPortions <= s.portionCapacity,
  );
export const localSchema = z.object({
  ru: z.string().trim().min(1).max(300),
  kz: z.string().trim().min(1).max(300),
});
export const itemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  name: localSchema,
  description: localSchema,
  category: z.enum([
    "hot",
    "soup",
    "bakery",
    "breakfast",
    "salad",
    "drink",
    "dessert",
    "combo",
  ]),
  price: z.number().int().min(0).max(100000),
  weight: z.string().max(40),
  stock: z.number().int().min(0).max(10000),
  active: z.boolean(),
  meatless: z.boolean(),
  hearty: z.boolean(),
  featured: z.boolean(),
  image: z
    .string()
    .max(2000000)
    .refine(
      (x) =>
        !x ||
        x.startsWith("/images/") ||
        /^\/api\/image\/[a-f0-9-]{36}$/.test(x) ||
        /^https:\/\//.test(x) ||
        /^data:image\/(png|jpeg|webp);base64,/.test(x),
    )
    .optional(),
  ingredients: localSchema.optional(),
  allergens: localSchema.optional(),
  components: z
    .array(z.object({ id: z.string(), qty: z.number().int().min(1).max(10) }))
    .max(15)
    .optional(),
});
export function localNow(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Almaty",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday),
  };
}
export const clock = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
export function getSlots(
  schedule: Schedule,
  orders: Order[],
  now = new Date(),
  presentation = false,
): Slot[] {
  const n = localNow(now);
  if (schedule.closed) return [];
  const result: Slot[] = [];
  const midnight = new Date(`${n.date}T00:00:00+05:00`).getTime();
  for (let offset = 0; offset < (presentation ? 2 : 1); offset++) {
    const day = localNow(new Date(midnight + offset * 86400000));
    if (
      (!presentation && day.day === 0) ||
      schedule.closedDates.includes(day.date)
    )
      continue;
    const close = day.day === 6 ? schedule.saturdayClose : schedule.close;
    if (!presentation && (n.minutes < schedule.open || n.minutes >= close))
      return [];
    for (
      let m = schedule.open;
      m + schedule.duration <= close;
      m += schedule.duration
    ) {
      const startsAt = midnight + offset * 86400000 + m * 60000;
      if (startsAt < now.getTime() + schedule.lead * 60000) continue;
      const id = `${day.date}T${clock(m)}+05:00`;
      const reserved = orders.filter(
        (o) => o.slot === id && !["cancelled", "rejected"].includes(o.status),
      );
      result.push({
        id,
        label: `${clock(m)}–${clock(m + schedule.duration)}`,
        remaining: Math.max(0, schedule.capacity - reserved.length),
        remainingPortions: Math.max(
          0,
          (schedule.portionCapacity ?? 48) -
            reserved.reduce(
              (total, o) =>
                total + (o.load ?? o.items.reduce((sum, i) => sum + i.qty, 0)),
              0,
            ),
        ),
      });
      if (presentation && result.length === 12) return result;
    }
  }
  return result;
}
export function stockNeeds(menu: Item[], items: { id: string; qty: number }[]) {
  const needs: Record<string, number> = {};
  for (const row of items) {
    const item = menu.find((x) => x.id === row.id);
    if (!item || !item.active) throw new BusinessError("UNAVAILABLE");
    needs[row.id] = (needs[row.id] || 0) + row.qty;
    for (const c of item.components || []) {
      const part = menu.find((x) => x.id === c.id);
      if (!part || !part.active || part.components?.length)
        throw new BusinessError("COMPONENT");
      needs[c.id] = (needs[c.id] || 0) + c.qty * row.qty;
    }
  }
  return needs;
}
export function portionLoad(
  menu: Item[],
  items: { id: string; qty: number }[],
) {
  return items.reduce((total, row) => {
    const item = menu.find((i) => i.id === row.id);
    return (
      total +
      row.qty *
        (item?.components?.length
          ? item.components.reduce((n, c) => n + c.qty, 0)
          : 1)
    );
  }, 0);
}
export function availability(item: Item, menu: Item[]) {
  let n = item.active ? item.stock : 0;
  for (const c of item.components || []) {
    const p = menu.find((x) => x.id === c.id);
    n = Math.min(n, p?.active ? Math.floor(p.stock / c.qty) : 0);
  }
  return n;
}
export function reserve(
  menu: Item[],
  items: { id: string; qty: number }[],
  direction: -1 | 1,
) {
  const needs = stockNeeds(menu, items);
  if (direction === -1)
    for (const [id, qty] of Object.entries(needs))
      if (menu.find((i) => i.id === id)!.stock < qty)
        throw new BusinessError("STOCK");
  for (const [id, qty] of Object.entries(needs))
    menu.find((i) => i.id === id)!.stock += direction * qty;
}
export function validateCheckout(
  menu: Item[],
  orders: Order[],
  schedule: Schedule,
  input: z.infer<typeof checkoutSchema>,
  now = new Date(),
  presentation = false,
) {
  const ids = input.items.map((x) => x.id);
  if (new Set(ids).size !== ids.length) throw new BusinessError("INVALID");
  for (const row of input.items) {
    const item = menu.find((i) => i.id === row.id);
    if (!item || !item.active) throw new BusinessError("UNAVAILABLE");
    if (item.price !== row.price) throw new BusinessError("PRICE_CHANGED");
  }
  const load = portionLoad(menu, input.items);
  if (load > (schedule.maxOrderPortions ?? 12))
    throw new BusinessError("ORDER_TOO_LARGE");
  const slot = getSlots(schedule, orders, now, presentation).find(
    (s) => s.id === input.slot,
  );
  if (!slot) throw new BusinessError("CLOSED");
  if (slot.remaining < 1) throw new BusinessError("SLOT_FULL");
  if ((slot.remainingPortions ?? 48) < load)
    throw new BusinessError("PORTION_CAPACITY");
  return input.items.reduce(
    (s, r) => s + menu.find((i) => i.id === r.id)!.price * r.qty,
    0,
  );
}
const next: Record<Status, Status[]> = {
  created: ["accepted", "rejected", "cancelled"],
  accepted: ["cooking", "cancelled", "rejected"],
  cooking: ["ready", "cancelled"],
  ready: ["issued", "cancelled"],
  issued: [],
  cancelled: [],
  rejected: [],
};
export function canTransition(
  role: Role,
  order: Order,
  target: Status,
  userId: string,
) {
  if (!next[order.status].includes(target))
    throw new BusinessError("TRANSITION");
  if (role === "student") {
    if (!["created", "accepted"].includes(order.status))
      throw new BusinessError("TRANSITION");
    if (order.userId !== userId || target !== "cancelled")
      throw new BusinessError("FORBIDDEN");
  } else if (role === "cashier") {
    if (target !== "issued") throw new BusinessError("FORBIDDEN");
  } else if (!["kitchen", "admin"].includes(role))
    throw new BusinessError("FORBIDDEN");
  if (target === "issued" && !order.paid)
    throw new BusinessError("PAYMENT_REQUIRED");
  return true;
}
export function safeCSV(rows: (string | number)[][]) {
  return (
    "\ufeff" +
    rows
      .map((r) =>
        r
          .map(
            (c) =>
              '"' +
              String(c)
                .replace(/^[=+@\-\t\r]/, "'$&")
                .replace(/"/g, '""') +
              '"',
          )
          .join(";"),
      )
      .join("\r\n")
  );
}
