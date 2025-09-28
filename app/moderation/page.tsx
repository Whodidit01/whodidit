"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ModerationPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setEmail(user?.email ?? null);

      if (!user) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Failed to load profile:", error);
        setAuthorized(false);
      } else {
        setAuthorized(data?.role === "owner");
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-300">Checking access...</div>;
  }

  if (!authorized) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Not authorized</h1>
        <p className="text-gray-400">
          You must be an admin to view this page
          {email ? ` (Signed in as ${email})` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">Moderation</h1>
      <p className="text-gray-400">Admin access confirmed. Build your tools here.</p>

      <div className="rounded-2xl p-4 border border-gray-700">
        <div className="text-lg font-medium mb-2">Queue</div>
        <div className="text-gray-400">No items yet.</div>
      </div>
    </div>
  );
}
