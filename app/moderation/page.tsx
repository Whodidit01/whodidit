"use client";

import React, { useEffect, useState } from "react";
// NOTE: moderation/page.tsx is two folders below the project root,
// so lib/supabase is imported with "../../lib/supabase"
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  role: string | null;
  is_admin: boolean | null;
};

type ViewState = "loading" | "need-login" | "forbidden" | "ok" | "error";

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl p-5 bg-white/5 backdrop-blur border border-white/10 shadow-lg">
    {children}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-xl font-semibold text-white mb-3">{children}</h2>
);

const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline";
  disabled?: boolean;
}> = ({ children, onClick, variant = "primary", disabled = false }) => (
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

export default function ModerationPage() {
  const [state, setState] = useState<ViewState>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1) Who is logged in?
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const user = userRes.user ?? null;
        if (!user) {
          if (!cancelled) setState("need-login");
          return;
        }

        // 2) Look up their profile
        const { data: profiles, error: profErr } = await supabase
          .from("profiles")
          .select("id, role, is_admin")
          .eq("id", user.id)
          .limit(1);

        if (profErr) throw profErr;

        const profile: Profile | undefined = profiles?.[0];
        const isAdmin = !!(
          profile &&
          (profile.role === "admin" || profile.is_admin === true)
        );

        if (!isAdmin) {
          if (!cancelled) setState("forbidden");
          return;
        }

        if (!cancelled) setState("ok");
      } catch (e: any) {
        if (!cancelled) {
          setMessage(e?.message || "Unknown error");
          setState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Render branching ----
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex items-center justify-center">
        <div className="text-white/70">Checking permissions…</div>
      </div>
    );
  }

  if (state === "need-login") {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex items-center justify-center px-6">
        <Card>
          <SectionTitle>Moderation</SectionTitle>
          <p className="text-white/80 mb-4">
            You must be signed in to view this page.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => (window.location.href = "/")}>Go Home</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex items-center justify-center px-6">
        <Card>
          <SectionTitle>Access denied</SectionTitle>
          <p className="text-white/80">
            This page is restricted to administrators.
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex items-center justify-center px-6">
        <Card>
          <SectionTitle>Moderation</SectionTitle>
          <p className="text-red-300">Error: {message}</p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---- state === "ok" (admin) ----
  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-6xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-white text-3xl font-bold">Moderation</div>
            <div className="text-white/60 text-sm">Admin dashboard</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Home
            </Button>
          </div>
        </div>

        {/* Top summary cards (static placeholders; wire to real tables later) */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-white/70 text-sm">Automatic Flags (24h)</div>
            <div className="text-3xl text-white font-semibold">7</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-white/70 text-sm">User Reports</div>
            <div className="text-3xl text-white font-semibold">3</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-white/70 text-sm">Open Cases</div>
            <div className="text-3xl text-white font-semibold">5</div>
          </div>
        </div>

        {/* Queue (static for now; swap to real data later) */}
        <Card>
          <SectionTitle>Flag Queue</SectionTitle>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-white/90">Potential policy violation in Review #{100 + i}</div>
                <div className="text-white/60 text-sm">
                  Summary: Reviewer alleges missed appointment; suggests refund or redo.
                </div>
                <div className="mt-2 flex gap-2">
                  <Button>Approve</Button>
                  <Button variant="outline">Archive</Button>
                  <Button variant="outline">Escalate</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-8 text-white/60 text-xs">
          © {new Date().getFullYear()} Whodid It? — Like it or not. All rights reserved.
        </div>
      </div>
    </div>
  );
}
