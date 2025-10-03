"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

// ---------- Helpers ----------
async function upsertProvider({ name, zip, service }: { name: string; zip?: string; service?: string }) {
  const n = (name || "").trim();
  const z = (zip || "").trim();
  const s = (service || "").trim();
  if (!n) throw new Error("Provider name is required");

  // Find by name (case-insensitive) and optional zip/service
  const { data: existing, error: findErr } = await supabase
    .from("providers")
    .select("id")
    .ilike("name", n)
    .eq("zip", z || null)
    .eq("service", s || null)
    .limit(1)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing?.id) return existing.id;

  const { data: inserted, error: insErr } = await supabase
    .from("providers")
    .insert({ name: n, zip: z || null, service: s || null })
    .select("id")
    .single();

  if (insErr) throw insErr;
  return inserted.id;
}

// ---------- Types ----------
type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline";
  disabled?: boolean;
};

type ChipProps = { children: React.ReactNode; active?: boolean };
type ScoreBarProps = { label: string; value: number };
type CardProps = { children: React.ReactNode };
type SectionTitleProps = { children: React.ReactNode };
type NavProps = { current: string; setCurrent: (id: string) => void; isAdmin: boolean };

type Stylist = {
  providerId: string; // real DB id (important!)
  name: string;
  service: string;
  zip: string;
  pricing: number;
  serviceScore: number;
  cleanliness: number;
  image: string;
};

// ---------- UI ----------
const Button = ({ children, onClick, variant = "primary", disabled = false }: ButtonProps) => (
  <button
    onClick={onClick ?? (() => {})}
    disabled={disabled}
    className={`px-4 py-2 rounded-2xl shadow ${
      variant === "outline"
        ? "border border-white/20 text-white hover:bg-white/10"
        : "bg-[#00D1B2] text-[#0D1117] hover:opacity-90"
    } disabled:opacity-50`}
  >
    {children}
  </button>
);

const Chip = ({ children, active }: ChipProps) => (
  <span
    className={`px-3 py-1 rounded-2xl text-sm mr-2 mb-2 inline-block ${
      active ? "bg-[#00D1B2] text-[#0D1117]" : "bg-white/10 text-white"
    }`}
  >
    {children}
  </span>
);

const ScoreBar = ({ label, value }: ScoreBarProps) => (
  <div className="mb-3">
    <div className="flex justify-between text-sm text-white/80">
      <span>{label}</span>
      <span>{value}/5</span>
    </div>
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div className="h-2" style={{ width: `${(value / 5) * 100}%`, background: "#00D1B2" }} />
    </div>
  </div>
);

const Card = ({ children }: CardProps) => (
  <div className="rounded-2xl p-5 bg-white/5 backdrop-blur border border-white/10 shadow-lg">{children}</div>
);

const SectionTitle = ({ children }: SectionTitleProps) => (
  <h2 className="text-xl font-semibold text-white mb-3">{children}</h2>
);

const Logo = () => (
  <div className="leading-tight">
    <div className="text-white text-3xl font-bold">Whodid It?</div>
    <div className="text-[#00D1B2]">Like it or not.</div>
  </div>
);

// ---------- Navigation ----------
const Nav = ({ current, setCurrent, isAdmin }: NavProps) => {
  const baseTabs = [
    { id: "home", label: "Home" },
    { id: "search", label: "Search" },
    { id: "profile", label: "Service Provider" },
    { id: "review", label: "Write Review" },
    { id: "resolve", label: "Resolve" },
    { id: "account", label: "My Profile" },
  ];
  const tabs = isAdmin ? [...baseTabs, { id: "moderate", label: "Moderation" }] : baseTabs;
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setCurrent(t.id)}
          className={`px-3 py-2 rounded-xl text-sm ${
            current === t.id ? "bg-white text-[#0D1117]" : "bg-white/10 text-white"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

// ---------- Search (DB-backed) ----------
type DBProvider = {
  id: string;
  name: string;
  zip: string | null;
  service: string | null;
};

const Search = ({ onSelect }: { onSelect: (s: Stylist) => void }) => {
  const [zip, setZip] = useState("");
  const [service, setService] = useState("");
  const [providers, setProviders] = useState<DBProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      const { data, error } = await supabase
        .from("providers")
        .select("id,name,zip,service")
        .limit(100);
      if (error) {
        setErr(error.message);
      } else {
        setProviders((data || []) as DBProvider[]);
      }
      setLoading(false);
    })();
  }, []);

  const results = useMemo<Stylist[]>(
    () =>
      providers
        .filter((p) => !zip || (p.zip || "").startsWith(zip))
        .filter(
          (p) =>
            !service ||
            (p.service || "").toLowerCase().includes(service.toLowerCase()) ||
            (p.name || "").toLowerCase().includes(service.toLowerCase())
        )
        .map((p, idx) => ({
          providerId: p.id, // ✅ Real DB ID
          name: p.name,
          service: p.service || "Service",
          zip: p.zip || "—",
          pricing: 0,
          serviceScore: 0,
          cleanliness: 0,
          image: `https://picsum.photos/seed/provider${idx + 1}/80/80`,
        })),
    [providers, zip, service]
  );

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card>
        <SectionTitle>Filters</SectionTitle>
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="ZIP code"
          className="w-full mb-3 px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
        />
        <input
          value={service}
          onChange={(e) => setService(e.target.value)}
          placeholder="Service or name"
          className="w-full mb-3 px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
        />
        {loading && <p className="text-white/60 text-sm">Loading…</p>}
        {err && <p className="text-red-300 text-sm">Error: {err}</p>}
      </Card>

      <div className="md:col-span-2 grid gap-4">
        {results.map((s) => (
          <Card key={s.providerId}>
            <div className="flex gap-4 items-center">
              <img src={s.image} alt={s.name} className="rounded-2xl" />
              <div className="flex-1">
                <div className="text-white font-semibold">
                  {s.name} — {s.service}
                </div>
                <div className="text-white/60 text-sm">ZIP {s.zip}</div>
                <div className="mt-2">
                  <Chip active>Pricing {s.pricing}/5</Chip>
                  <Chip active>Service {s.serviceScore}/5</Chip>
                  <Chip active>Cleanliness {s.cleanliness}/5</Chip>
                </div>
              </div>
              <Button onClick={() => onSelect(s)}>Open profile</Button>
            </div>
          </Card>
        ))}

        {results.length === 0 && !loading && !err && (
          <Card>
            <div className="text-white/70">No results yet. Try adjusting filters.</div>
          </Card>
        )}
      </div>
    </div>
  );
};
