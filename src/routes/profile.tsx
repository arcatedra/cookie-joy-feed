import { createFileRoute } from "@tanstack/react-router";
import {
  Settings,
  Heart,
  CreditCard,
  SlidersHorizontal,
  HelpCircle,
  ChevronRight,
  Award,
  Cookie,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import avatar from "@/assets/avatar.jpg";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Oys" },
      { name: "description", content: "Manage your Oys account, orders, and subscription." },
    ],
  }),
  component: ProfilePage,
});

const menuItems = [
  { label: "Favorites", Icon: Heart },
  { label: "Payment Methods", Icon: CreditCard },
  { label: "General Settings", Icon: SlidersHorizontal },
  { label: "Help & Support", Icon: HelpCircle },
];

function ProfilePage() {
  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Top blue banner */}
      <header className="relative bg-primary px-5 pt-12 pb-20">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10" />
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-[0.15em] text-primary-foreground">
            My Profile
          </h1>
          <button
            className="grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/10 text-primary-foreground"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Profile card */}
      <section className="relative -mt-14 px-5">
        <div className="rounded-3xl bg-card p-6 shadow-lg ring-1 ring-border">
          {/* Avatar */}
          <div className="flex justify-center -mt-14">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-cream shadow-md">
              <img
                src={avatar}
                alt="Alex R."
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Credentials */}
          <div className="mt-4 text-center">
            <h2 className="text-xl font-bold text-foreground">Alex R.</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">New York</p>
            <p className="mt-1 text-xs text-muted-foreground">Joined: July 2024</p>
          </div>

          {/* Stats bar */}
          <div className="mt-5 flex items-center justify-around">
            <div className="flex flex-col items-center px-4">
              <span className="text-lg font-bold text-foreground">28</span>
              <span className="text-[11px] font-medium text-muted-foreground">Orders</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center px-4">
              <span className="text-lg font-bold text-foreground">12</span>
              <span className="text-[11px] font-medium text-muted-foreground">Favorites</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center px-4">
              <span className="text-lg font-bold text-foreground">Cookie Fan</span>
              <span className="text-[11px] font-medium text-muted-foreground">Level</span>
            </div>
          </div>
        </div>
      </section>

      {/* Active Plan */}
      <section className="mt-6 px-5">
        <div className="flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/10">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary-foreground/70">Current Plan</p>
              <p className="text-sm font-bold">Enthusiast Plan</p>
            </div>
          </div>
          <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400">
            Active
          </span>
        </div>
      </section>

      {/* Recent Orders */}
      <section className="mt-6 px-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">
          Recent Orders
        </h3>
        <div className="mt-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-cream">
                <Cookie className="h-5 w-5 text-brown" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Order #1023</p>
                <p className="text-xs text-muted-foreground">Classic Choc Chip · 1 item</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">29-26, 2023</span>
          </div>
        </div>
      </section>

      {/* Account Navigation */}
      <section className="mt-6 px-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">
          Account
        </h3>
        <div className="mt-3 rounded-2xl bg-card shadow-sm ring-1 ring-border overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-accent ${
                i !== menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <item.Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
