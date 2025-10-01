"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

// --- tiny UI bits ---
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

// --- types ---
type ClaimRow = {
  id: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  business_email: string | null;
  phone: string | null;
  website: string | null;
  claimant_user: string;
  provider_id: string;
  providers: {
    id: string;
    name: string | null;
    zip: string | null;
    service: string | null;
    claimed: boolean | null;
    owner_user: string | null;
  } | null;
  users: { email: string | null } | null;
};

type ContactRow = {
  id: string;
  created_at: string;
  from_user: string | null;
  status: "new" | "read" | "closed";
  email: string | null;
  name: string | null;
  question: string | null;
};

// --- page ---
export default function ModerationPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [note, setNote] = useState("");

  // queues
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // gate: only admins can view this page
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.is_admin) setIsAdmin(true);
    })();
  }, []);

  const loadClaims = async () => {
    setLoadingClaims(true);
    const { data, error } = await supabase
      .from("provider_claims")
      .select(`
        id, created_at, status, business_email, phone, website, claimant_user, provider_id,
        providers:provider_id ( id, name, zip, service, claimed, owner_user ),
        users:claimant_user ( email )
      `)
      .neq("status", "rejected") // show pending/approved up top; tweak as you like
      .order("created_at", { ascending: true });
    if (!error && Array.isArray(data)) setClaims(data as unknown as ClaimRow[]);

  };

  const loadContacts = async () => {
    setLoadingContacts(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .neq("status", "closed") // show new/read; keep closed out of queue
      .order("created_at", { ascending: true });
    if (!error && Array.isArray(data)) setContacts(data as ContactRow[]);
    setLoadingContacts(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadClaims();
    loadContacts();
  }, [isAdmin]);

  // --- claim actions ---
  const approveClaim = async (claimId: string, providerId: string, claimantUser: string) => {
    setNote("Approving claim…");
    const { error: pErr } = await supabase
      .from("providers")
      .update({ owner_user: claimantUser, claimed: true })
      .eq("id", providerId);
    if (pErr) return setNote("Error (provider update): " + pErr.message);

    const { data: me } = await supabase.auth.getUser();
    const { error: cErr } = await supabase
      .from("provider_claims")
      .update({
        status: "approved",
        decided_at: new Date().toISOString(),
        decided_by: me?.user?.id ?? null,
      })
      .eq("id", claimId);
    if (cErr) return setNote("Error (claim update): " + cErr.message);

    setNote("Approved.");
    await loadClaims();
  };

  const rejectClaim = async (claimId: string) => {
    setNote("Rejecting claim…");
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("provider_claims")
      .update({
        status: "rejected",
        decided_at: new Date().toISOString(),
        decided_by: me?.user?.id ?? null,
      })
      .eq("id", claimId);
    if (error) return setNote("Error: " + error.message);
    setNote("Rejected.");
    await loadClaims();
  };

  // --- contact actions ---
  const setContactStatus = async (id: string, status: "new" | "read" | "closed") => {
    setNote("Updating message…");
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
    if (error) return setNote("Error (contact update): " + error.message);
    setNote("Updated.");
    await loadContacts();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white">
        <div className="max-w-5xl mx-auto px-5 py-10">
          <Card>
            <SectionTitle>Moderation</SectionTitle>
            <p className="text-white/70">You must be an admin to view this page.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        {note && (
          <div className="text-white/70 text-sm">{note}</div>
        )}

        {/* Provider Claims */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Moderation — Provider Claims</SectionTitle>
            <Button variant="outline" onClick={loadClaims}>
              {loadingClaims ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {claims.length === 0 ? (
            <div className="text-white/60">No claims in queue.</div>
          ) : (
            <div className="space-y-3">
              {claims.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-white font-medium">
                    {c.providers?.name || "Unknown"} — {c.providers?.service || "—"} (ZIP {c.providers?.zip || "—"})
                  </div>
                  <div className="text-white/70 text-sm">
                    Claimant: {c.users?.email || c.claimant_user} • Submitted:{" "}
                    {new Date(c.created_at).toLocaleString()} • Status: {c.status}
                  </div>
                  <div className="text-white/60 text-sm mt-1">
                    Email: {c.business_email || "—"} • Phone: {c.phone || "—"} • Site: {c.website || "—"}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button onClick={() => approveClaim(c.id, c.provider_id, c.claimant_user)}>Approve</Button>
                    <Button variant="outline" onClick={() => rejectClaim(c.id)}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Contact Messages */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Contact Messages (Need help?)</SectionTitle>
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
                  <div className="text-white font-medium">
                    {m.name || "Anonymous"} {m.email ? `• ${m.email}` : ""}
                  </div>
                  <div className="text-white/70 text-sm">
                    Received: {new Date(m.created_at).toLocaleString()} • Status: {m.status}
                  </div>
                  <div className="text-white/80 mt-2 whitespace-pre-wrap">{m.question || "(no message)"}</div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" onClick={() => setContactStatus(m.id, "read")}>Mark read</Button>
                    <Button onClick={() => setContactStatus(m.id, "closed")}>Resolve</Button>
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
