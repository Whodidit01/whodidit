"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

// --- tiny UI helpers ---
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
    onClick={onClick}
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

type ClaimRow = {
  id: string;
  created_at: string;
  status: string;
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
  from_user: string | null;
  name: string | null;
  email: string | null;
  message: string | null;
  status: string; // 'new' | 'archived'
};

export default function ModerationPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = checking
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [note, setNote] = useState("");

  // Check admin
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(!!data?.is_admin);
    })();
  }, []);

  // Load provider claims (pending)
  const loadClaims = async () => {
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
    if (!error && Array.isArray(data)) {
      // supabase types this array loosely; cast to our shape
      setClaims(data as unknown as ClaimRow[]);
    }
  };

  // Load new contact messages
  const loadContacts = async () => {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("id, created_at, from_user, name, email, message, status")
      .eq("status", "new")
      .order("created_at", { ascending: false });
    if (!error && Array.isArray(data)) {
      setContacts(data as ContactRow[]);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadClaims();
      loadContacts();
    }
  }, [isAdmin]);

  const approve = async (claimId: string, providerId: string, claimantUser: string) => {
    setNote("Approving...");
    const { error: pErr } = await supabase
      .from("providers")
      .update({ owner_user: claimantUser, claimed: true })
      .eq("id", providerId);
    if (pErr) { setNote("Error (provider update): " + pErr.message); return; }

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

  const archiveContact = async (id: string) => {
    const { error } = await supabase
      .from("contact_messages")
      .update({ status: "archived" })
      .eq("id", id);
    if (!error) loadContacts();
  };

  const escalateContact = async (id: string) => {
    // you can extend with another table/status; for now mark archived and leave a note
    const { error } = await supabase
      .from("contact_messages")
      .update({ status: "archived" })
      .eq("id", id);
    if (!error) {
      setNote("Escalated (marked archived).");
      loadContacts();
    }
  };

  // ----- Render -----
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white">
        <div className="max-w-6xl mx-auto px-5 py-6">
          <Header />
          <div className="text-white/70">Checking access…</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white">
        <div className="max-w-6xl mx-auto px-5 py-6">
          <Header />
          <Card>
            <SectionTitle>Forbidden</SectionTitle>
            <div className="text-white/70">You must be an admin to view Moderation.</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-6xl mx-auto px-5 py-6">
        <Header />

        <Card>
          <SectionTitle>Moderation — Provider Claims</SectionTitle>
          <p className="text-white/70 mb-3">
            Approve or reject ownership claims. Approving sets the provider’s owner and marks it as claimed.
          </p>
          <div className="flex items-center gap-3 mb-3">
            <Button onClick={loadClaims} variant="outline">Refresh</Button>
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

        <Card>
          <SectionTitle>Contact Messages (Need help?)</SectionTitle>
          <div className="flex items-center gap-3 mb-3">
            <Button onClick={loadContacts} variant="outline">Refresh</Button>
          </div>
          {contacts.length === 0 ? (
            <div className="text-white/60">No new messages.</div>
          ) : (
            <div className="space-y-3">
              {contacts.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-white/80 text-sm mb-1">
                    From: <strong>{m.name || "Anonymous"}</strong> • {m.email || "—"} •{" "}
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                  <div className="text-white">{m.message}</div>
                  <div className="mt-2 flex gap-2">
                    <Button onClick={() => archiveContact(m.id)} variant="outline">Archive</Button>
                    <Button onClick={() => escalateContact(m.id)}>Escalate</Button>
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

function Header() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <div className="text-white text-3xl font-bold leading-tight">Whodid It?</div>
        <div className="text-[#00D1B2] -mt-1">Like it or not.</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => (window.location.href = "/")}
          className="px-4 py-2 rounded-2xl shadow bg-white/10 text-white hover:bg-white/20"
        >
          Back to site
        </button>
      </div>
    </div>
  );
}
