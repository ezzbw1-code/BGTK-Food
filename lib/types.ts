export type Lang = "ru" | "kz";
export type Role = "guest" | "student" | "kitchen" | "cashier" | "admin";
export type Status =
  | "created"
  | "accepted"
  | "cooking"
  | "ready"
  | "issued"
  | "cancelled"
  | "rejected";
export type Local = { ru: string; kz: string };
export type Item = {
  id: string;
  name: Local;
  description: Local;
  category: string;
  price: number;
  weight: string;
  stock: number;
  active: boolean;
  meatless: boolean;
  hearty: boolean;
  featured: boolean;
  image?: string;
  ingredients?: Local;
  allergens?: Local;
  components?: { id: string; qty: number }[];
};
export type OrderItem = { id: string; name: Local; qty: number; price: number };
export type Order = {
  id: string;
  number: string;
  userId: string;
  status: Status;
  payment: "cash" | "card";
  paid: boolean;
  paymentStatus?: "pending" | "paid" | "refund_required" | "refunded";
  total: number;
  slot: string;
  comment: string;
  token: string;
  items: OrderItem[];
  createdAt: string;
  events: { status: Status; at: string; reason?: string }[];
  version: number;
  load?: number;
};
export type Schedule = {
  open: number;
  close: number;
  saturdayClose: number;
  duration: number;
  capacity: number;
  portionCapacity?: number;
  maxOrderPortions?: number;
  lead: number;
  closed: boolean;
  closedDates: string[];
};
export type Slot = {
  id: string;
  label: string;
  remaining: number;
  remainingPortions?: number;
};
export type State = {
  mode: "demo" | "production";
  sharedDemo?: boolean;
  role: Role;
  name: string;
  userId: string;
  menu: Item[];
  favorites: string[];
  orders: Order[];
  slots: Slot[];
  schedule: Schedule;
  notifications: { id: string; orderId: string; status: Status; at: string }[];
  now: string;
  supabaseUrl?: string;
  supabaseKey?: string;
};
