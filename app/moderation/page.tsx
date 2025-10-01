"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";


// --- UI helpers (tiny) ---
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl p-5 bg-white/5 backdrop-blur border border-white/10 shadow-lg">{children}</div>
);
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-white mb-3">{children}</h2>
);
const Button = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline";
  disabled?: boolean;
}) => (
  <button
    onClick={onClick ?? (() => {})}
    disabled={disabled}
    className={`px-3 py-2 rounded-2xl text-sm shadow ${
      variant === "outline"
        ? "border border-white/20 text-white hover:bg-white/10"
        : "bg-[#00D1B2] text-[#0D1117] hover:opacity-90"
    } disabled:opacity-50`}
  >
    {children}
  </button>
);

// --- Types (minimal) ---
type ClaimRow = {
  id: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  business_email: string | null;
  phone: string | null;
  website: string | null;
  claimant_user: string;
  provider_id: string;
  providers: { id: string; name: string; zip: string | null; service: string | null; claimed: boolean; owner_user: string | null } | null;
  users: { email: string | null } | null;
};

type ContactRow = {
  id: string;
  created_at: string;
  status: "new" | "archived" | "escalated";
  name: string | null;
  email: string | null;
  question: string | null;
  from_user: string | null;
};

// --- Component ---
export default function ModerationPage() {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [note, setNote] = useState("");

  // Load provider claims (pending)
  const loadClaims = async () => {
    setLoadingClaims(true);
    const { data, error } = await supabase
      .from("provider_claims")
      .select(`
        id, created_at, status, business_email, phone, website, claimant_user, provider_id,
        providers:provider_id ( id, name, zip, service, claimed, owner_user ),
        users:claimant_user ( email )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (!error && Array.isArray(data)) {
      // data comes as any[], cast safely
      setClaims(data as unknown as ClaimRow[]);
    }
    setLoadingClaims(false);
  };

  // Load contact messages (new)
  const loadContacts = async () => {
    setLoadingContacts(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("id, created_at, status, name, email, question, from_user")
      .in("status", ["new", "escalated"]) // show new + escalated in queue
      .order("created_at", { ascending: false });
    if (!error && Array.isArray(data)) setContacts(data as ContactRow[]);
    setLoadingContacts(false);
  };

  useEffect(() => {
    loadClaims();
    loadContacts();
  }, []);

  // Approve / Reject provider claim
  const approve = async (claimId: string, providerId: string, claimantUser: string) => {
    setNote("Approving…");
    const { error: pErr } = await supabase
      .from("providers")
      .update({ owner_user: claimantUser, claimed: true })
      .eq("id", providerId);
    if (pErr) {
      setNote("Error (provider update): " + pErr.message);
      return;
    }
    const { data: me } = await supabase.auth.getUser();
    const { error: cErr } = await supabase
      .from("provider_claims")
      .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: me?.user?.id ?? null })
      .eq("id", claimId);
    if (cErr) {
      setNote("Error (claim update): " + cErr.message);
      return;
    }
    setNote("Approved.");
    await loadClaims();
  };

  const reject = async (claimId: string) => {
    setNote("Rejecting…");
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("provider_claims")
      .update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: me?.user?.id ?? null })
      .eq("id", claimId);
    if (error) {
      setNote("Error: " + error.message);
      return;
    }
    setNote("Rejected.");
    await loadClaims();
  };

  // Archive / Escalate messages
  const archiveMessage = async (id: string) => {
    const { error } = await supabase.from("contact_messages").update({ status: "archived" }).eq("id", id);
    if (!error) setContacts((prev) => prev.filter((m) => m.id !== id));
  };
  const escalateMessage = async (id: string) => {
    const { error } = await supabase.from("contact_messages").update({ status: "escalated" }).eq("id", id);
    if (!error) {
      // keep it visible but mark escalated
      setContacts((prev) => prev.map((m) => (m.id === id ? { ...m, status: "escalated" } as ContactRow : m)));
    }
  };

  // KPIs (simple)
  const kpiClaims = claims.length;
  const kpiNewMsgs = contacts.filter((c) => c.status === "new").length;
  const kpiEscalated = contacts.filter((c) => c.status === "escalated").length;

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-6xl mx-auto px-5 py-6">
        {/* ===== Overview tiles (ADMIN DASHBOARD LOOK) ===== */}
        <Card>
          <SectionTitle>Moderation — Admin Overview</SectionTitle>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-white/70 text-sm">Pending Provider Claims</div>
              <div className="text-3xl text-white font-semibold">{kpiClaims}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-white/70 text-sm">New Contact Messages</div>
              <div className="text-3xl text-white font-semibold">{kpiNewMsgs}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-white/70 text-sm">Escalated Items</div>
              <div className="text-3xl text-white font-semibold">{kpiEscalated}</div>
            </div>
          </div>
        </Card>

        <div className="h-6" />

        {/* ===== Provider Claims ===== */}
        <Card>
          <SectionTitle>Provider Claims</SectionTitle>
          <div className="flex items-center gap-3 mb-3">
            <Button variant="outline" onClick={loadClaims}>{loadingClaims ? "Refreshing…" : "Refresh"}</Button>
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

        <div className="h-6" />

        {/* ===== Contact Messages + Flag Queue (Archive/Escalate) ===== */}
        <Card>
          <SectionTitle>Contact Messages (Need help?)</SectionTitle>
          <div className="mb-3">
            <Button variant="outline" onClick={loadContacts}>
              {loadingContacts ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {contacts.length === 0 ? (
            <div className="text-white/60">No new messages.</div>
          ) : (
            <div className="space-y-3">
              {contacts.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-medium">
                      {m.name || "Anonymous"} • {m.email || "no email"}
                    </div>
                    <div className="text-white/60 text-xs">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-white/80 mt-1">{m.question || "(no message body)"}</div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" onClick={() => archiveMessage(m.id)}>Archive</Button>
                    <Button onClick={() => escalateMessage(m.id)}>Escalate</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
