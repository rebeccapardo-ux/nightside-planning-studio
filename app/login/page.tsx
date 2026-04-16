"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const supabase = createSupabaseBrowserClient();

  const signUp = async () => {
    setMessage("Signing up...");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Signed up.");
    }
  };

  const signIn = async () => {
    setMessage("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({ email, 
password });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Signed in successfully.");
    }
  };

  const signOut = async () => {
    setMessage("Signing out...");
    await supabase.auth.signOut();
    setMessage("Signed out.");
  };

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 420 }}>
      <h1>Login</h1>

      <label style={{ display: "block", marginTop: 12 }}>
        Email
        <input
          style={{ display: "block", width: "100%", padding: 8, marginTop: 
4 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>
        Password
        <input
          style={{ display: "block", width: "100%", padding: 8, marginTop: 
4 }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
        />
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={signUp}>Sign up</button>
        <button onClick={signIn}>Sign in</button>
        <button onClick={signOut}>Sign out</button>
      </div>

      <p style={{ marginTop: 16 }}>{message}</p>
    </main>
  );
}
