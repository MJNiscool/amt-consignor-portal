'use client';
export const dynamic = 'force-dynamic';

import { signIn } from 'next-auth/react';

export default function SignupPage() {
  const handleGoogleSignup = () => {
    signIn('google');
  };

  return (
    <div>
      <h1>Sign Up</h1>
      <p>Use your Google account to sign up:</p>
      <button onClick={handleGoogleSignup}>Sign Up with Google</button>
    </div>
  );
}
