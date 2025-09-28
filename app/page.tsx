"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
async function upsertProvider({ name, zip, service }) {
  const n = (name || "").trim();
  const z = (zip || "").trim();
  const s = (service || "").trim();
  if (!n) throw new Error("Provider name is required");

  // Try to find an existing provider by name+zip+service (case-insensitive)
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

  // Create a new provider
  const { data: inserted, error: insErr } = await supabase
    .from("providers")
    .insert({ name: n, zip: z || null, service: s || null })
    .select("id")
    .single();

  if (insErr) throw insErr;
  return inserted.id;
}




// ----- UI helpers -----
type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;                 // ⬅ make optional
  variant?: "primary" | "outline";
  disabled?: boolean;
};

const Button = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
}: ButtonProps) => (
  <button
    onClick={onClick ?? (() => {})}      // ⬅ safe no-op fallback
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


const Chip = ({ children, active }) => (
  <span className={`px-3 py-1 rounded-2xl text-sm mr-2 mb-2 inline-block ${active ? "bg-[#00D1B2] text-[#0D1117]" : "bg-white/10 text-white"}`}>{children}</span>
);
const ScoreBar = ({ label, value }) => (
  <div className="mb-3">
    <div className="flex justify-between text-sm text-white/80"><span>{label}</span><span>{value}/5</span></div>
    <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-2" style={{width: `${(value/5)*100}%`, background: "#00D1B2"}}/></div>
  </div>
);
const Card = ({ children }) => (
  <div className="rounded-2xl p-5 bg-white/5 backdrop-blur border border-white/10 shadow-lg">{children}</div>
);
const SectionTitle = ({ children }) => (
  <h2 className="text-xl font-semibold text-white mb-3">{children}</h2>
);
const Logo = () => (
  <div className="leading-tight">
    <div className="text-white text-3xl font-bold">Whodid It?</div>
    <div className="text-[#00D1B2]">Like it or not.</div>
  </div>
);

// ----- Navigation -----
const Nav = ({ current, setCurrent, isAdmin }) => {
  const baseTabs = [
    { id: "home", label: "Home" },
    { id: "search", label: "Search" },
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

// ----- Mock data -----
const mockStylists = [
  { id: 1, name: "Ava C.", service: "Hairstylist", zip: "10001", pricing: 4, serviceScore: 5, cleanliness: 4, image: "https://picsum.photos/seed/ava/80/80" },
  { id: 2, name: "Bella M.", service: "Makeup Artist", zip: "30309", pricing: 3, serviceScore: 4, cleanliness: 5, image: "https://picsum.photos/seed/bella/80/80" },
  { id: 3, name: "Noah L.", service: "Lash Tech", zip: "90001", pricing: 5, serviceScore: 3, cleanliness: 4, image: "https://picsum.photos/seed/noah/80/80" },
];

// ----- Sections -----
const Home = ({ go }) => (
  <div className="grid md:grid-cols-2 gap-6">
    <Card>
      <SectionTitle>Find trusted beauty pros and reviews</SectionTitle>
      <p className="text-white/80 mb-4">Search by ZIP and service. See permanent, timestamped reviews. Anonymous or named — your choice.</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => go("search")}>Search near me</Button>
        <Button variant="outline" onClick={() => go("review")}>Write a review</Button>
        <Button variant="outline" onClick={() => go("profile")}>Claim your profile</Button>
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

const Search = ({ onSelect }) => {
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
        <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP code" className="w-full mb-3 px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50" />
        <input value={service} onChange={(e) => setService(e.target.value)} placeholder="Service (hair, makeup, lashes)" className="w-full mb-3 px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50" />
        <p className="text-white/60 text-sm">Tip: try 100, 303, or 900.</p>
      </Card>
      <div className="md:col-span-2 grid gap-4">
        {results.map((s) => (
          <Card key={s.id}>
            <div className="flex gap-4 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt={s.name} className="rounded-2xl" />
              <div className="flex-1">
                <div className="text-white font-semibold">{s.name} — {s.service}</div>
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

const Profile = ({ stylist, onWrite }) => {
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
          <img src={stylist.image} className="rounded-2xl" />
          <div>
            <div className="text-white text-xl font-semibold">{stylist.name}</div>
            <div className="text-white/70 text-sm">{stylist.service} • ZIP {stylist.zip}</div>
          </div>
        </div>
        <ScoreBar label="Pricing" value={stylist.pricing} />
        <ScoreBar label="Customer Service" value={stylist.serviceScore} />
        <ScoreBar label="Cleanliness" value={stylist.cleanliness} />
        <div className="mt-4 flex gap-2">
          <Button onClick={onWrite}>Write a review</Button>
          <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("go-claim"))}>Claim this profile</Button>
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
    if (!agree) { setMsg("Please agree to the disclaimer."); return; }
    if (!providerName.trim()) { setMsg("Please enter the service provider name."); return; }
    if (!body.trim() || body.trim().length < 30) { setMsg("Please write at least 30 characters."); return; }

    // NOTE: media upload to Supabase Storage can be added later.
    // For now we’ll save ratings + text + linkage to provider.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMsg("Please log in first."); return; }

      // 1) Get/create provider record
      const providerId = await upsertProvider({ name: providerName, zip, service: svc });

      // 2) Insert review
      const { error: insErr } = await supabase.from("reviews").insert({
        provider_id: providerId,
        author_user: user.id,
        pricing_score: pricing,
        service_score: serviceScore,
        cleanliness_score: cleanliness,
        body,
        anonymous
      });

      if (insErr) { setMsg("Error saving review: " + insErr.message); return; }

      // Reset
      setProviderName(""); setZip(""); setSvc("");
      setPricing(5); setServiceScore(5); setCleanliness(5);
      setAnonymous(true); setPhotos([]); setVideo(null); setAgree(false); setBody("");
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
          onChange={(e)=>setProviderName(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
        />
        <input
          placeholder="ZIP code"
          value={zip}
          onChange={(e)=>setZip(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
        />
        <input
          placeholder="Service (e.g., cut, makeup, lashes)"
          value={svc}
          onChange={(e)=>setSvc(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 md:col-span-2"
        />

        {/* three category ratings */}
        <div>
          <label className="block text-white/80 mb-2">Pricing (1–5)</label>
          <select value={pricing} onChange={(e)=>setPricing(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white/10 text-white">
            {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-white/80 mb-2">Service (1–5)</label>
          <select value={serviceScore} onChange={(e)=>setServiceScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white/10 text-white">
            {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-white/80 mb-2">Cleanliness (1–5)</label>
          <select value={cleanliness} onChange={(e)=>setCleanliness(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white/10 text-white">
            {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <textarea
          placeholder="Your honest experience (min 30 chars)"
          value={body}
          onChange={(e)=>setBody(e.target.value)}
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
          <div className="text-white/60 text-sm mt-1">{video ? (video.name || "Selected") : "None selected"}</div>
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <input id="anon" type="checkbox" checked={anonymous} onChange={()=>setAnonymous(!anonymous)} />
          <label htmlFor="anon" className="text-white">Post anonymously</label>
        </div>

        <div className="md:col-span-2 text-white/80 text-sm bg:white/5 p-3 rounded-xl border border-white/10">
          <strong>Disclaimer:</strong> I certify that my statements are true and based on my experience.
          I understand that reviews are permanent and subject to moderation. Harassment or threats are prohibited.
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <input id="agree" type="checkbox" checked={agree} onChange={()=>setAgree(!agree)} />
          <label htmlFor="agree" className="text-white">I agree to the terms above.</label>
        </div>

        <div className="md:col-span-2">
          <Button onClick={handleSubmit} disabled={!agree}>Submit review</Button>
        </div>

        {msg && <div className="md:col-span-2 text-white/80">{msg}</div>}
      </div>
    </Card>
  );
};


  return (
    <Card>
      <SectionTitle>Write a Review</SectionTitle>
      <div className="grid md:grid-cols-2 gap-4">
        <input placeholder="Service Provider name" className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50" />
        <input placeholder="ZIP code" className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50" />
        <input placeholder="Service (e.g., cut, makeup, lashes)" className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 md:col-span-2" />
        <div>
          <label className="block text-white/80 mb-2">Overall rating (1–5)</label>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-white/10 text-white">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <textarea placeholder="Your honest experience (min 30 chars)" className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 md:col-span-2" rows={4} />
        <div>
          <label className="block text-white/80 mb-2">Upload photos (max 4)</label>
          <input type="file" accept="image/*" multiple onChange={handlePhotos} className="text-white" />
          <div className="text-white/60 text-sm mt-1">Selected: {photos.length}/4</div>
        </div>
        <div>
          <label className="block text-white/80 mb-2">Upload video (max 1)</label>
          <input type="file" accept="video/*" onChange={handleVideo} className="text-white" />
          <div className="text-white/60 text-sm mt-1">{video ? (video.name || "Selected") : "None selected"}</div>
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <input id="anon" type="checkbox" checked={anonymous} onChange={() => setAnonymous(!anonymous)} />
          <label htmlFor="anon" className="text-white">Post anonymously</label>
        </div>
        <div className="md:col-span-2 text-white/80 text-sm bg-white/5 p-3 rounded-xl border border-white/10">
          <strong>Disclaimer:</strong> I certify that my statements are true and based on my experience. I understand that reviews are permanent and subject to moderation. Harassment or threats are prohibited.
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <input id="agree" type="checkbox" checked={agree} onChange={() => setAgree(!agree)} />
          <label htmlFor="agree" className="text-white">I agree to the terms above.</label>
        </div>
        <div className="md:col-span-2">
          <Button disabled={!agree}>Submit review</Button>
        </div>
      </div>
    </Card>
  );
};

const Resolve = () => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedService, setSelectedService] = useState("Refund");
  const priceFor = (opt) => (opt === "Help filing civil suit" ? 19.99 : 4.99);

  return (
    <Card>
      <SectionTitle>Resolve an Issue</SectionTitle>
      <p className="text-white/80 mb-4">Get next steps for small claims, chargebacks, or reporting the service provider. To proceed, upload proof of appointment/interaction.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-white/80 mb-2">Proof of service (receipt, DMs, booking, etc.)</label>
          <input type="file" className="text-white" multiple />
        </div>
        <div>
          <label className="block text-white/80 mb-2">Select service</label>
          <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/10 text-white">
            <option>Refund</option>
            <option>Fix/Redo</option>
            <option>Report service provider</option>
            <option>Help filing civil suit</option>
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
            <p className="text-white/80 mb-3">You selected: <strong>{selectedService}</strong> — ${priceFor(selectedService).toFixed(2)}</p>
            <div className="grid md:grid-cols-2 gap-3">
              <input placeholder="Full name" className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50" />
              <input placeholder="Email for updates" className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50" />
              <input placeholder="Card number" className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 md:col-span-2" />
            </div>
            <div className="mt-3 flex gap-2">
              <Button>Pay ${priceFor(selectedService).toFixed(2)}</Button>
              <Button variant="outline" onClick={() => setShowCheckout(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const Moderation = () => (
  <Card>
    <SectionTitle>Moderation Dashboard</SectionTitle>
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-white/5 rounded-xl p-4 border border-white/10"><div className="text-white/70 text-sm">Automatic Flags (24h)</div><div className="text-3xl text-white font-semibold">7</div></div>
      <div className="bg-white/5 rounded-xl p-4 border border-white/10"><div className="text-white/70 text-sm">User Reports</div><div className="text-3xl text-white font-semibold">3</div></div>
      <div className="bg-white/5 rounded-xl p-4 border border-white/10"><div className="text-white/70 text-sm">Open Cases</div><div className="text-3xl text-white font-semibold">5</div></div>
    </div>
    <div className="mt-4">
      <div className="text-white font-medium mb-2">Flag Queue</div>
      <div className="space-y-3">
        {[1,2,3].map((i) => (
          <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-white/90">Potential policy violation in Review #{100+i}</div>
            <div className="text-white/60 text-sm">Summary: Reviewer alleges missed appointment; suggests refund or redo.</div>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

const Claim = ({ stylist }) => (
  <Card>
    <SectionTitle>Claim your service provider profile</SectionTitle>
    <p className="text-white/80 mb-4">Profiles can be claimed by verified owners to respond, dispute, or resolve reviews. We’ll verify ownership via email/phone and proof of business.</p>
    <div className="grid md:grid-cols-2 gap-3">
      <input placeholder="Business/Provider name" defaultValue={stylist?.name||""} className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"/>
      <input placeholder="Contact email" className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"/>
      <input placeholder="Phone (optional)" className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"/>
      <input placeholder="ZIP code" defaultValue={stylist?.zip||""} className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"/>
      <input placeholder="Website/Instagram (optional)" className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 md:col-span-2"/>
    </div>
    <div className="mt-4 flex gap-2">
      <Button>Request verification</Button>
      <Button variant="outline" onClick={() => alert('We will email you verification steps.')}>What’s needed?</Button>
    </div>
  </Card>
);

const Account = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
const [myReviews, setMyReviews] = useState<any[]>([]);

  useEffect(() => {
  supabase.auth.getUser().then(async ({ data }) => {
    const currentUser = data.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (!error) {
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
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setMessage("Logged out."); };

  return (
    <Card>
      <SectionTitle>My Profile</SectionTitle>
      {user ? (
  <>
    <p className="text-white/80 mb-3">Signed in as {user.email}</p>
    <Button variant="outline" onClick={handleLogout}>Log out</Button>

    <div className="mt-6">
      <h3 className="text-lg font-semibold text-white mb-2">My Reviews</h3>
      {myReviews.length === 0 && (
        <p className="text-white/60 text-sm">You haven’t posted any reviews yet.</p>
      )}
      <ul className="space-y-4">
        {myReviews.map((review) => (
          <li key={review.id} className="bg-white/5 p-3 rounded-xl border border-white/10">
            <p className="text-white font-medium">{review.provider_name}</p>
            <p className="text-white/80 text-sm">{review.comment}</p>
            <p className="text-white/60 text-xs">Posted on {new Date(review.created_at).toLocaleDateString()}</p>
          </li>
        ))}
      </ul>
    </div>
  </>

      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-3">
            <input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50" />
            <input placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSignup}>Create account</Button>
            <Button variant="outline" onClick={handleLogin}>Log in</Button>
          </div>
        </>
      )}
      {message && <p className="text-white/70 mt-3">{message}</p>}
    </Card>
  );
};

// ----- App root -----
export default function App() {
  const [tab, setTab] = useState("home");
  const [selected, setSelected] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // toggle to true after you add owner role

  useEffect(() => {
    const handler = () => setTab("claim");
    window.addEventListener("go-claim", handler);
    return () => window.removeEventListener("go-claim", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-6xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <Logo />
          <Nav current={tab} setCurrent={setTab} isAdmin={isAdmin} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {tab === "home" && <Home go={setTab} />}
            {tab === "search" && <Search onSelect={(s) => { setSelected(s); setTab("profile"); }} />}
            {tab === "profile" && <Profile stylist={selected} onWrite={() => setTab("review")} />}
            {tab === "review" && <ReviewForm />}
            {tab === "resolve" && <Resolve />}
            {tab === "account" && <Account />}
            {tab === "claim" && <Claim stylist={selected} />}
            {tab === "moderate" && isAdmin && <Moderation />}
          </motion.div>
        </AnimatePresence>
        <div className="mt-8 text-white/60 text-xs">© {new Date().getFullYear()} Whodid It? — Like it or not. All rights reserved.</div>
      </div>
    </div>
  );
}
