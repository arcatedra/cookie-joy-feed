import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Heart, MessageCircle, Play, Home as HomeIcon, Compass, Package, User, Bell } from "lucide-react";
import reel1 from "@/assets/reel-1.jpg";
import reel2 from "@/assets/reel-2.jpg";
import reel3 from "@/assets/reel-3.jpg";
import trend1 from "@/assets/trend-1.jpg";
import trend2 from "@/assets/trend-2.jpg";
import trend3 from "@/assets/trend-3.jpg";
import avatar from "@/assets/avatar.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oys — Gourmet Cookies, Delivered Monthly" },
      { name: "description", content: "Discover artisanal gourmet cookies and join the Oys monthly subscription for freshly baked treats at your door." },
      { property: "og:title", content: "Oys — Gourmet Cookies" },
      { property: "og:description", content: "Discover gourmet cookies & monthly subscriptions with Oys." },
    ],
  }),
  component: Home,
});

const reels = [
  { img: reel1, title: "Double Choc Delight", likes: "12.4k" },
  { img: reel2, title: "Freshly Baked!", likes: "8.1k" },
  { img: reel3, title: "Doughy Goodness", likes: "5.7k" },
];

const trending = [
  { img: trend1, name: "Classic Choc Chunk", caption: "Gooey center, golden crust" },
  { img: trend2, name: "Salted Caramel", caption: "Sweet meets salty perfection" },
  { img: trend3, name: "Matcha White Choc", caption: "Earthy & elegant" },
];

const categories = ["Cookies", "Brownies", "Assorted Boxes", "Vegan", "Gift Sets"];

function Home() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header banner */}
      <header className="bg-primary text-primary-foreground rounded-b-[2rem] px-5 pt-12 pb-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60">Welcome back</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Good Morning, Alex!</h1>
            <p className="mt-1 text-sm text-primary-foreground/70">Fresh batches dropped today</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/10 backdrop-blur">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-cta" />
            </button>
            <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-primary-foreground/30">
              <img src={avatar} alt="Alex avatar" className="h-full w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6">
          <div className="flex items-center gap-3 rounded-full bg-background px-5 py-3.5 shadow-md">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search cookies, flavors, boxes…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
      </header>

      {/* Reels */}
      <section className="mt-7">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-lg font-bold text-foreground">Reels</h2>
          <button className="text-xs font-semibold text-cta">See all</button>
        </div>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
          {reels.map((r) => (
            <article
              key={r.title}
              className="relative h-56 w-36 shrink-0 overflow-hidden rounded-2xl shadow-md"
            >
              <img src={r.img} alt={r.title} className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
              <button className="absolute top-1/2 left-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-lg backdrop-blur">
                <Play className="h-5 w-5 fill-primary text-primary" />
              </button>
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <div className="flex flex-col items-center gap-0.5 rounded-full bg-black/30 px-1.5 py-1 backdrop-blur">
                  <Heart className="h-3.5 w-3.5 text-white" />
                  <span className="text-[9px] font-semibold text-white">{r.likes}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 rounded-full bg-black/30 px-1.5 py-1 backdrop-blur">
                  <MessageCircle className="h-3.5 w-3.5 text-white" />
                  <span className="text-[9px] font-semibold text-white">128</span>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs font-bold leading-tight text-white drop-shadow">{r.title}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-lg font-bold text-foreground">Trending Now</h2>
          <button className="text-xs font-semibold text-cta">View more</button>
        </div>
        <div className="no-scrollbar mt-3 flex gap-4 overflow-x-auto px-5 pb-2">
          {trending.map((t) => (
            <article
              key={t.name}
              className="w-44 shrink-0 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border"
            >
              <div className="aspect-square overflow-hidden bg-cream">
                <img src={t.img} alt={t.name} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.caption}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">$8.50</span>
                  <button className="rounded-full bg-cta px-3 py-1 text-[11px] font-semibold text-cta-foreground">
                    Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mt-7">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-lg font-bold text-foreground">Featured Categories</h2>
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 pb-2">
          {categories.map((c, i) => (
            <button
              key={c}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                i === 0
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-cream text-[color:var(--brown)] hover:bg-cream/70"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Subscription CTA */}
      <section className="mt-7 px-5">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cta/30 blur-2xl" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cta">Monthly box</p>
          <h3 className="mt-2 text-xl font-bold leading-tight">12 fresh cookies, delivered to your door.</h3>
          <p className="mt-1 text-sm text-primary-foreground/70">Cancel anytime · Free shipping</p>
          <button className="mt-4 rounded-full bg-cta px-5 py-2.5 text-sm font-bold text-cta-foreground shadow-md">
            Start subscription
          </button>
        </div>
      </section>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md">
        <div className="m-3 flex items-center justify-around rounded-full bg-primary px-3 py-2.5 shadow-2xl">
          {[
            { id: "home", label: "Home", Icon: Home },
            { id: "explore", label: "Explore", Icon: Compass },
            { id: "subscribe", label: "Subscribe", Icon: Package },
            { id: "profile", label: "Profile", Icon: User },
          ].map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-full px-3 py-2 transition ${
                  active ? "bg-cta text-cta-foreground" : "text-primary-foreground/70"
                }`}
                aria-label={label}
              >
                <Icon className="h-5 w-5" />
                {active && <span className="text-xs font-semibold">{label}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
