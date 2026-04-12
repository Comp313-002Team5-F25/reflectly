import { useState } from 'react';

type LoginProps = {
  onContinue: () => void;
};

export default function Login({ onContinue }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <section className="min-h-screen flex items-center justify-center px-6">
      <div className="glass rounded-xl2 p-8 shadow-soft border border-white/10 w-full max-w-md">
        
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Welcome to Reflectly</h1>
          <p className="text-sm text-mist/70 mt-2">
            Sign in to continue your reflection journey
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-4"
        >
          {/* Email */}
          <div>
            <label className="block text-sm text-mist/80 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full glass rounded-xl2 px-4 py-3 outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-mist/80 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full glass rounded-xl2 px-4 py-3 outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            className="w-full px-4 py-3 rounded-xl2 bg-accent text-ink hover:opacity-90 transition"
          >
            Sign In
          </button>
        </form>

        {/* Divider */}
        <div className="my-4 text-center text-xs text-mist/60">
          or
        </div>

        {/* Guest button */}
        <button
          type="button"
          onClick={onContinue}
          className="w-full px-4 py-3 rounded-xl2 border border-white/15 hover:bg-white/5 transition"
        >
          Continue as Guest
        </button>

        {/* Footer */}
        <p className="mt-4 text-xs text-mist/60 text-center">
          This is a demo login screen. No real authentication is required.
        </p>
      </div>
    </section>
  );
}