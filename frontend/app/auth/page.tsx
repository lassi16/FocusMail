"use client";

import { useRouter } from "next/navigation";

export default function AuthPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-900/40 border border-green-800/50 mb-5">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neutral-100 tracking-tight">FocusMail</h1>
          <p className="text-neutral-500 mt-2 text-sm">AI-Powered Email Intelligence</p>
        </div>

        {/* Sign-in card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm p-8 shadow-2xl shadow-black/40">
          <p className="text-center text-sm text-neutral-400 mb-6">
            Sign in to access your intelligent inbox
          </p>

          {/* Google Sign-In Button */}
          <a
            href={`${apiBase}/auth/login`}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-700 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-100 hover:border-neutral-500 active:scale-[0.98]"
          >
            {/* Google "G" logo SVG */}
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continue with Google
          </a>

          <p className="text-center text-xs text-neutral-600 mt-5 leading-relaxed">
            By signing in you grant FocusMail permission to<br/>read and analyse your Gmail messages.
          </p>
        </div>

        {/* Features strip */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "🧠", label: "AI Classification" },
            { icon: "📅", label: "Event Extraction" },
            { icon: "💬", label: "Smart Chat" },
          ].map(({ icon, label }) => (
            <div key={label} className="rounded-xl border border-neutral-800/60 bg-neutral-900/40 px-3 py-3">
              <div className="text-xl mb-1">{icon}</div>
              <p className="text-[11px] text-neutral-500 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
