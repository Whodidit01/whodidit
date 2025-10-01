"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function HelpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<null | "sending" | "ok" | "error">(null);
  const [error, setError] = useState("");

  const submit = async () => {
    setStatus("sending");
    setError("");

    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("error");
      setError("Please fill out name, email, and your question.");
      return;
    }

    const { error } = await supabase.from("contact_messages").insert({
      name,
      email,
      message,
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }

    setStatus("ok");
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-3xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-bold mb-4">Need help?</h1>

        <div className="rounded-2xl p-5 bg-white/5 backdrop-blur border border-white/10 shadow-lg">
          <p className="text-white/80 mb-4">
            Send us a quick note and we’ll get back to you.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
            />
            <input
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
            />
          </div>

          <textarea
            placeholder="Your question"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-3 w-full px-3 py-2 rounded-xl bg-white/10 text-white placeholder-white/50"
            rows={5}
          />

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={submit}
              disabled={status === "sending"}
              className="px-4 py-2 rounded-2xl shadow bg-[coral] text-black disabled:opacity-60"
            >
              {status === "sending" ? "Sending..." : "Send"}
            </button>

            {status === "ok" && (
              <span className="text-green-400 text-sm">Message sent. Thank you!</span>
            )}
            {status === "error" && (
              <span className="text-red-400 text-sm">{error}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
