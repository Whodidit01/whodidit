"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl p-5 bg-white/5 backdrop-blur border border-white/10 shadow-lg">
    {children}
  </div>
);
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-white mb-3">{children}</h2>
);

async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,role")
    .eq("id", user.id)
    .single();
  return { user, profile };
}

export default function ModerationRoute() {
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    (async () => {
      const { profile } = await getMyProfile();
      if (profile?.role === "admin") setStatus("ok");
      else setStatus("denied");
    })();
  }, []);

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-[#0D1117] text-white p-6">
      <div className="max-w-5xl mx-auto">{children}</div>
    </div>
  );

  if (status === "loading") {
    return (
      <Shell>
        <div>Loading…</div>
      </Shell>
    );
  }

  if (status === "denied") {
    return (
      <Shell>
        <Card>
          <SectionTitle>Not authorized</SectionTitle>
          <p className="text-white/80">
            This page is only available to the site owner. Please log in with your admin account.
          </p>
        </Card>
      </Shell>
    );
  }

  // ---- Your moderation UI ----
  return (
    <Shell>
      <Card>
        <SectionTitle>Moderation Dashboard</SectionTitle>
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

        <div className="mt-4">
          <div className="text-white font-medium mb-2">Flag Queue</div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-white/90">Potential policy violation in Review #{100 + i}</div>
                <div className="text-white/60 text-sm">
                  Summary: Reviewer alleges missed appointment; suggests refund or redo.
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </Shell>
  );
}
