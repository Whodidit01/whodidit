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
  id: number;
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
    { id: "profile", label: "Service Provider" }, // keep profile tab to preview a provider
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

// ---------- Mock data ----------
const mockStylists: Stylist[] = [
  {
    id: 1,
    name: "Ava C.",
    service: "Hairstylist",
    zip: "10001",
    pricing: 4,
    serviceScore: 5,
    cleanliness: 4,
    image: "https://picsum.photos/seed/ava/80/80",
  },
  {
    id: 2,
    name: "Bella M.",
    service: "Makeup Artist",
    zip: "30309",
    pricing: 3,
    serviceScore: 4,
    cleanliness: 5,
    image: "https://picsum.photos/seed/bella/80/80",
  },
  {
    id: 3,
    name: "Noah L.",
    service: "Lash Tech",
    zip: "90001",
    pricing: 5,
    serviceScore: 3,
    cleanliness: 4,
    image: "https://picsum.photos/seed/noah/80/80",
  },
];

// ---------- Sections ----------
const Home = ({ go }: { go: (id: string) => void }) => (
  <div className="grid md:grid-cols-2 gap-6">
    <Card>
      <SectionTitle>Find trusted beauty pros and reviews</SectionTitle>
      <p className="text-white/80 mb-4">
        Search by ZIP and service. See permanent, timestamped reviews. Anonymous or named — your choice.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => go("search")}>Search near me</Button>
        <Button variant="outline" onClick={() => go("review")}>
          Write a review
        </Button>
        <Button variant="outline" onClick={() => go("profile")}>
          Claim your profile
        </Button>
      </div>
    </Card>
    <Card>
      <SectionTitle>Why users trust us</SectionTitle>
      <ul className="text-white/80 list-disc ml-5 space-y-2">
        <li>Reviews can’t be edited or deleted by stylists.</li>
        <li>Scorecards for Pricing, Service, Cleanliness.</li>
        <li>Independent moderation with strict content standards.</li>
      </ul>
    </Card>
  </div>
);

const Search = ({ onSelect }: { onSelect: (s: Stylist) => void }) => {
  const [zip, setZip] = useState("");
  const [service, setService] = useState("");
  const results = useMemo(
    () =>
      mockStylists.filter(
        (s) => (!zip || s.zip.startsWith(zip)) && (!service || s.service.toLowerCase().includes(service.toLowerCase()))
      ),
    [zip, service]
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
          placeholder="Service (hair, makeup, lashes)"
          className="w-full mb-3 px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
        />
        <p className="text-white/60 text-sm">Tip: try 100, 303, or 900.</p>
      </Card>
      <div className="md:col-span-2 grid gap-4">
        {results.map((s) => (
          <Card key={s.id}>
            <div className="flex gap-4 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
        {results.length === 0 && (
          <Card>
            <div className="text-white/70">No results yet. Try adjusting filters.</div>
          </Card>
        )}
      </div>
    </div>
  );
};

const Profile = ({ stylist, onWrite }: { stylist: Stylist | null; onWrite: () => void }) => {
  if (!stylist)
    return (
      <Card>
        <div className="text-white/70">Pick a service provider from Search to preview a profile.</div>
      </Card>
    );
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card>
        <div className="flex gap-4 items-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stylist.image} alt={stylist.name} className="rounded-2xl" />
          <div>
            <div className="text-white text-xl font-semibold">{stylist.name}</div>
            <div className="text-white/70 text-sm">
              {stylist.service} • ZIP {stylist.zip}
            </div>
          </div>
        </div>
        <ScoreBar label="Pricing" value={stylist.pricing} />
        <ScoreBar label="Customer Service" value={stylist.serviceScore} />
        <ScoreBar label="Cleanliness" value={stylist.cleanliness} />
        <div className="mt-4 flex gap-2">
          <Button onClick={onWrite}>Write a review</Button>
          {/* @ts-ignore - CustomEvent on window */}
          <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("go-claim"))}>
            Claim this profile
          </Button>
        </div>
      </Card>
      <div className="md:col-span-2 grid gap-4">
        <Card>
          <SectionTitle>Recent Reviews</SectionTitle>
          <div className="space-y-4">
            <div>
              <div className="text-white font-medium">Anonymous</div>
              <p className="text-white/80">Loved the bob cut. Quick and clean studio.</p>
            </div>
            <div>
              <div className="text-white font-medium">Zara • 10001</div>
              <p className="text-white/80">Makeup was great, but check-in ran 15m late.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const ReviewForm = () => {
  const [providerName, setProviderName] = useState("");
  const [zip, setZip] = useState("");
  const [svc, setSvc] = useState("");

  const [pricing, setPricing] = useState(5);
  const [serviceScore, setServiceScore] = useState(5);
  const [cleanliness, setCleanliness] = useState(5);

  const [anonymous, setAnonymous] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    setPhotos(files as File[]);
  };

  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideo((e.target.files || [])[0] || null);
  };

  const handleSubmit = async () => {
    setMsg("");

    if (!agree) {
      setMsg("Please agree to the disclaimer.");
      return;
    }
    if (!providerName.trim()) {
      setMsg("Please enter the service provider name.");
      return;
    }
    if (!body.trim() || body.trim().length < 30) {
      setMsg("Please write at least 30 characters.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMsg("Please log in first.");
        return;
      }

      const providerId = await upsertProvider({ name: providerName, zip, service: svc });

      const { error } = await supabase.from("reviews").insert({
        provider_id: providerId,
        author_user: user.id,
        pricing_score: pricing,
        service_score: serviceScore,
        cleanliness_score: cleanliness,
        body,
        anonymous,
      });

      if (error) {
        setMsg("Error saving review: " + error.message);
        return;
      }

      setProviderName("");
      setZip("");
      setSvc("");
      setPricing(5);
      setServiceScore(5);
      setCleanliness(5);
      setAnonymous(true);
      setPhotos([]);
      setVideo(null);
      setAgree(false);
      setBody("");
      setMsg("Review submitted! Thanks for helping the community.");
    } catch (e: any) {
      setMsg("Error: " + (e?.message || e));
    }
  };

  return (
    <Card>
      <SectionTitle>Write a Review</SectionTitle>
      <div className="grid md:grid-cols-2 gap-4">
        <input
          placeholder="Service Provider name"
          value={providerName}
          onChange={(e) => setProviderName(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
        />
        <input
          placeholder="ZIP code"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
        />
        <input
          placeholder="Service (e.g., cut, makeup, lashes)"
          value={svc}
          onChange={(e) => setSvc(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 md:col-span-2"
        />

        {/* Ratings */}
        <div>
          <label className="block text-white/80 mb-2">Pricing (1–5)</label>
          <select
            value={pricing}
            onChange={(e) => setPricing(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-white/10 text-white"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-white/80 mb-2">Service (1–5)</label>
          <select
            value={serviceScore}
            onChange={(e) => setServiceScore(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-white/10 text-white"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-white/80 mb-2">Cleanliness (1–5)</label>
          <select
            value={cleanliness}
            onChange={(e) => setCleanliness(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-white/10 text-white"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <textarea
          placeholder="Your honest experience (min 30 chars)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 md:col-span-2"
          rows={4}
        />

        <div>
          <label className="block text-white/80 mb-2">Upload photos (max 4)</label>
          <input type="file" accept="image/*" multiple onChange={handlePhotos} className="text-white" />
          <div className="text-white/60 text-sm mt-1">Selected: {photos.length}/4</div>
        </div>
        <div>
          <label className="block text-white/80 mb-2">Upload video (max 1)</label>
          <input type="file" accept="video/*" onChange={handleVideo} className="text-white" />
          <div className="text-white/60 text-sm mt-1">{video ? video.name : "None selected"}</div>
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <input id="anon" type="checkbox" checked={anonymous} onChange={() => setAnonymous(!anonymous)} />
          <label htmlFor="anon" className="text-white">
            Post anonymously
          </label>
        </div>

        <div className="md:col-span-2 text-white/80 text-sm bg-white/5 p-3 rounded-xl border border-white/10">
          <strong>Disclaimer:</strong> I certify that my statements are true and based on my experience. I understand that
          reviews are permanent and subject to moderation. Harassment or threats are prohibited.
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <input id="agree" type="checkbox" checked={agree} onChange={() => setAgree(!agree)} />
          <label htmlFor="agree" className="text-white">
            I agree to the terms above.
          </label>
        </div>

        <div className="md:col-span-2">
          <Button onClick={handleSubmit} disabled={!agree}>
            Submit review
          </Button>
        </div>

        {msg && <div className="md:col-span-2 text-white/80">{msg}</div>}
      </div>
    </Card>
  );
};

const Resolve = () => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedService, setSelectedService] = useState("Refund");
  const priceFor = (opt: string) => (opt === "Civil suit steps" ? 10.00 : 4.99);

  return (
    <Card>
      <SectionTitle>Resolve an Issue</SectionTitle>
      <p className="text-white/80 mb-4">
        Get next steps for small claims, chargebacks, or reporting the service provider. To proceed, upload proof of
        appointment/interaction.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-white/80 mb-2">Proof of service (receipt, DMs, booking, etc.)</label>
          <input type="file" className="text-white" multiple />
        </div>
        <div>
          <label className="block text-white/80 mb-2">Select service</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/10 text-white"
          >
            <option>Refund</option>
            <option>Fix/Redo</option>
            <option>Report service provider</option>
            <option>Civil suit steps</option>
          </select>
          <div className="text-white/70 text-sm mt-2">Price: ${priceFor(selectedService).toFixed(2)}</div>
        </div>
        <div className="md:col-span-2 flex flex-wrap gap-3">
          <Button onClick={() => setShowCheckout(true)}>Help me resolve this</Button>
          <Button variant="outline">Add stylist profile</Button>
        </div>
        {showCheckout && (
          <div className="md:col-span-2 bg-white/5 p-4 rounded-xl border border-white/10 text-white/90">
            <div className="font-semibold mb-2">Checkout</div>
            <p className="text-white/80 mb-3">
              You selected: <strong>{selectedService}</strong> — ${priceFor(selectedService).toFixed(2)}
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <input
                placeholder="Full name"
                className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
              />
              <input
                placeholder="Email for updates"
                className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
              />
              <input
                placeholder="Card number"
                className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 md:col-span-2"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button>Pay ${priceFor(selectedService).toFixed(2)}</Button>
              <Button variant="outline" onClick={() => setShowCheckout(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const Moderation = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  const loadClaims = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("provider_claims")
      .select(`
        id,
        created_at,
        status,
        business_email,
        phone,
        website,
        claimant_user,
        provider_id,
        providers:provider_id ( id, name, zip, service, claimed, owner_user ),
        users:claimant_user ( email )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (!error && Array.isArray(data)) setClaims(data);
    setLoading(false);
  };

  useEffect(() => { loadClaims(); }, []);

  const approve = async (claimId: string, providerId: string, claimantUser: string) => {
    setNote("Approving...");
    // 1) set provider owner + claimed
    const { error: pErr } = await supabase
      .from("providers")
      .update({ owner_user: claimantUser, claimed: true })
      .eq("id", providerId);

    if (pErr) { setNote("Error (provider update): " + pErr.message); return; }

    // 2) mark claim approved
    const { data: me } = await supabase.auth.getUser();
    const { error: cErr } = await supabase
      .from("provider_claims")
      .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: me?.user?.id ?? null })
      .eq("id", claimId);

    if (cErr) { setNote("Error (claim update): " + cErr.message); return; }

    setNote("Approved.");
    await loadClaims();
  };

  const reject = async (claimId: string) => {
    setNote("Rejecting...");
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("provider_claims")
      .update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: me?.user?.id ?? null })
      .eq("id", claimId);
    if (error) { setNote("Error: " + error.message); return; }
    setNote("Rejected.");
    await loadClaims();
  };

  return (
    <Card>
      <SectionTitle>Moderation — Provider Claims</SectionTitle>
      <p className="text-white/70 mb-3">Approve or reject ownership claims. Approving sets the provider’s owner and marks it as claimed.</p>
      <div className="flex items-center gap-3 mb-3">
        <Button onClick={loadClaims} variant="outline">{loading ? "Refreshing..." : "Refresh"}</Button>
        {note && <span className="text-white/70 text-sm">{note}</span>}
      </div>

      {claims.length === 0 ? (
        <div className="text-white/60">No pending claims.</div>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => (
            <div key={c.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-white font-medium">
                {c.providers?.name || "Unknown"} — {c.providers?.service || "—"} (ZIP {c.providers?.zip || "—"})
              </div>
              <div className="text-white/70 text-sm">
                Claimant: {c.users?.email || c.claimant_user} • Submitted: {new Date(c.created_at).toLocaleString()}
              </div>
              <div className="text-white/60 text-sm mt-1">
                Email: {c.business_email || "—"} • Phone: {c.phone || "—"} • Site: {c.website || "—"}
              </div>
              <div className="mt-2 flex gap-2">
                <Button onClick={() => approve(c.id, c.provider_id, c.claimant_user)}>Approve</Button>
                <Button variant="outline" onClick={() => reject(c.id)}>Reject</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const Claim = ({ stylist }: { stylist: Stylist | null }) => {
  const [bizEmail, setBizEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [name, setName] = useState(stylist?.name || "");
  const [zip, setZip] = useState(stylist?.zip || "");
  const [svc, setSvc] = useState(stylist?.service || "");
  const [msg, setMsg] = useState("");

  const submitClaim = async () => {
    setMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMsg("Please log in first (My Profile tab), then come back to claim.");
        return;
      }
      if (!name.trim()) { setMsg("Please enter the Business/Provider name."); return; }

      // uses your upsertProvider helper already in this file
      const providerId = await upsertProvider({ name, zip, service: svc });

      const { error } = await supabase.from("provider_claims").insert({
        provider_id: providerId,
        claimant_user: user.id,
        business_email: bizEmail || null,
        phone: phone || null,
        website: website || null,
      });
      if (error) throw error;

      setMsg("Claim submitted! We’ll review and email you after a decision.");
    } catch (e: any) {
      setMsg(`Error: ${e?.message || e}`);
    }
  };

  return (
    <Card>
      <SectionTitle>Claim your service provider profile</SectionTitle>
      <p className="text-white/80 mb-4">
        Profiles can be claimed by verified owners to respond, dispute, or resolve reviews.
        We’ll verify ownership via email/phone and proof of business.
      </p>

      <div className="grid md:grid-cols-2 gap-3">
        <input
          placeholder="Business/Provider name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
        />
        <input
          placeholder="ZIP code"
          value={zip}
          onChange={(e)=>setZip(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
        />
        <input
          placeholder="Service (hair, makeup, lashes)"
          value={svc}
          onChange={(e)=>setSvc(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 md:col-span-2"
        />

        <input
          placeholder="Contact email (for verification)"
          value={bizEmail}
          onChange={(e)=>setBizEmail(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 md:col-span-2"
        />
        <input
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e)=>setPhone(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
        />
        <input
          placeholder="Website/Instagram (optional)"
          value={website}
          onChange={(e)=>setWebsite(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={submitClaim}>Request verification</Button>
        <Button variant="outline" onClick={() => alert('We will email you verification steps.')}>
          What’s needed?
        </Button>
      </div>

      {msg && <div className="mt-3 text-white/80">{msg}</div>}
    </Card>
  );
};

const Account = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [myReviews, setMyReviews] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const currentUser = data.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: reviews, error } = await supabase
          .from("reviews")
          .select("*")
          .eq("author_user", currentUser.id) // matches insert column
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(reviews)) {
          setMyReviews(reviews);
        }
      }
    });
  }, []);

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(error ? `Error: ${error.message}` : "Check your email to confirm your account!");
  };
  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? `Error: ${error.message}` : `Welcome back!`);
    if (data?.user) setUser(data.user);
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMessage("Logged out.");
  };

  return (
    <Card>
      <SectionTitle>My Profile</SectionTitle>
      {user ? (
        <>
          <p className="text-white/80 mb-3">Signed in as {user.email}</p>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-2">My Reviews</h3>
            {myReviews.length === 0 && <p className="text-white/60 text-sm">You haven’t posted any reviews yet.</p>}
            <ul className="space-y-4">
              {myReviews.map((review) => (
                <li key={review.id} className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <p className="text-white/80 text-sm">{review.body}</p>
                  <p className="text-white/60 text-xs">
                    Posted on {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSignup}>Create account</Button>
            <Button variant="outline" onClick={handleLogin}>
              Log in
            </Button>
          </div>
        </>
      )}
      {message && <p className="text-white/70 mt-3">{message}</p>}
    </Card>
  );
};

// ---------- App root ----------
export default function App() {
  const [tab, setTab] = useState("home");
  const [selected, setSelected] = useState<Stylist | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // toggle after you add owner role

  useEffect(() => {
    const handler = () => setTab("claim");
    window.addEventListener("go-claim", handler as EventListener);
    return () => window.removeEventListener("go-claim", handler as EventListener);
  }, []);
// ↓ Add this NEW effect right under the go-claim effect
useEffect(() => {
  (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && data?.is_admin) setIsAdmin(true);
  })();
}, []);

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-6xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <Logo />
          <Nav current={tab} setCurrent={setTab} isAdmin={isAdmin} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "home" && <Home go={setTab} />}
            {tab === "search" && (
              <Search
                onSelect={(s) => {
                  setSelected(s);
                  setTab("profile");
                }}
              />
            )}
            {tab === "profile" && <Profile stylist={selected} onWrite={() => setTab("review")} />}
            {tab === "review" && <ReviewForm />}
            {tab === "resolve" && <Resolve />}
            {tab === "account" && <Account />}
            {tab === "claim" && <Claim stylist={selected} />}
            {tab === "moderate" && isAdmin && <Moderation />}
          </motion.div>
        </AnimatePresence>
        <div className="mt-8 text-white/60 text-xs">
          © {new Date().getFullYear()} Whodid It? — Like it or not. All rights reserved.
        </div>
      </div>
    </div>
  );
}
