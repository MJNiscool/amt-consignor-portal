'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { signup, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await signup(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Signup failed. Please try again.');
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err) {
      setError('Google sign-up failed.');
    }
  };

  return (
    <div>
      <h1>Sign Up</h1>
      <form onSubmit={handleSignup}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit">Sign Up</button>
      </form>
      <button onClick={handleGoogleSignup}>Sign Up with Google</button>
      {error && <p>{error}</p>}
    </div>
  );
}
