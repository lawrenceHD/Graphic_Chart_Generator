import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Shield, Zap, Sparkles, Lock, Mail, Github } from 'lucide-react';

interface AuthProps {
  onNavigate: (screen: 'landing' | 'auth' | 'dashboard' | 'studio', slug?: string) => void;
  onLoginSuccess: (email?: string) => void;
}

export function Auth({ onNavigate, onLoginSuccess }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess(email || 'utilisateur@demo.charta');
    onNavigate('dashboard');
  };

  const handleGuestAccess = () => {
    onLoginSuccess('guest@session.charta');
    onNavigate('dashboard');
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between p-4 sm:p-6 bg-blueprint">
      {/* Top Bar */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2 text-sm font-semibold text-ink-2 hover:text-ink transition-colors px-3 py-1.5 rounded-full hover:bg-surface border border-transparent hover:border-line"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </button>

        <div className="flex items-center gap-2 font-display font-bold text-lg text-ink">
          <div className="w-7 h-7 rounded-lg bg-ink text-surface flex items-center justify-center font-mono font-black text-xs">
            C
          </div>
          <span>Charta</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto w-full my-auto py-8">
        <div className="bg-surface border-2 border-line-strong rounded-3xl p-6 sm:p-8 shadow-brutal">
          <div className="text-center mb-6">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink tracking-tight">
              {isSignUp ? 'Créer votre compte' : 'Accéder au Studio'}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-ink-2">
              Retrouvez vos chartes graphiques, vos palettes et vos exports.
            </p>
          </div>

          {/* Social OAuth Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={() => {
                onLoginSuccess('google.user@gmail.com');
                onNavigate('dashboard');
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-line bg-elevated/50 hover:bg-elevated font-semibold text-xs sm:text-sm text-ink flex items-center justify-center gap-2.5 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            <button
              onClick={() => {
                onLoginSuccess('github.dev@charta.org');
                onNavigate('dashboard');
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-line bg-elevated/50 hover:bg-elevated font-semibold text-xs sm:text-sm text-ink flex items-center justify-center gap-2.5 transition-colors shadow-sm"
            >
              <Github className="w-4 h-4" />
              <span>Continuer avec GitHub</span>
            </button>
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[11px] font-mono uppercase text-ink-3">ou par email</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1">Adresse email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="nom@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <Mail className="w-4 h-4 text-ink-3 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1">Mot de passe</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <Lock className="w-4 h-4 text-ink-3 absolute right-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-ink text-surface font-semibold text-sm shadow-md hover:opacity-90 active:scale-95 transition-all mt-2"
            >
              {isSignUp ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>

          {/* Toggle Login / Signup */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-ink-2 hover:text-ink font-medium"
            >
              {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire"}
            </button>
          </div>

          {/* Zero Friction Guest Session Section */}
          <div className="mt-6 pt-5 border-t border-line text-center bg-elevated/40 -mx-6 -mb-6 p-5 rounded-b-3xl">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-600 mb-1">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Session Invité Sans Friction</span>
            </div>
            <p className="text-xs text-ink-3 mb-3">
              Pas envie de créer de compte maintenant ? Essayez immédiatement toutes les fonctionnalités.
            </p>
            <button
              onClick={handleGuestAccess}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-line-strong bg-surface hover:bg-elevated font-bold text-xs text-ink shadow-brutal-sm flex items-center justify-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              <span>Entrer en mode invité</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-md mx-auto text-center text-xs text-ink-3 pb-2">
        <span>Sécurisé par Better Auth • Données chiffrées • Conforme RGPD</span>
      </div>
    </div>
  );
}
