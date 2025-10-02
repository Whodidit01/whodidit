"use client";

import React, { useState } from "react";
import { supabase } from "../../lib/supabase"

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

export default function HelpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");

  const send = async () => {
    setNote("");
    if (!message.trim()) {
      setNote("Please enter a message.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("contact_messages").insert({
      name: name || null,
      email: email || null,
      message,
      from_user: user?.id ?? null,
      status: "new",
    });
    if (error) {
      setNote("Error: " + error.message);
      return;
    }
    setName(""); setEmail(""); setMessage("");
    setNote("Message sent. Thank you!");
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-3xl mx-auto px-5 py-6">
        <Header />
        <Card>
          <SectionTitle>Need help?</SectionTitle>
          <p className="text-white/70 mb-4">
            Send us a quick note. Your message goes straight to our team.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
            />
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
            />
            <textarea
              placeholder="Your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="md:col-span-2 px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
            />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={send}>Send</Button>
            {note && <span className="text-white/70 text-sm">{note}</span>}
          </div>
        </Card>

        <div className="h-6" />

        <Card>
          <SectionTitle>About us / Legal</SectionTitle>
          <div className="space-y-2 text-white/80 text-sm">
            <p><strong>About Whodid It?Like it or not.</strong> We help clients share honest, permanent reviews of beauty services and assist with issue resolution.</p>
            <p><strong>Disclaimer:</strong> Reviews are user-submitted and subject to moderation. Harassment or threats are prohibited. whodid it? Like it or not. is a public review platform.
We verify every review.
All users are responsible for the truthfulness of their claims.
whodid it? Like it or not. is not a legal authority and cannot guarantee results in disputes or legal actions.
By using our "Resolve the Issue" service, you acknowledge that no refund, resolution, or legal success is guaranteed.
Use of the platform is at your own risk</p>
            <p><strong>Contact:</strong> Use the form above. We typically reply within 1–2 business days.</p>
          </div>
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
