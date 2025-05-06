export default function PendingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-yellow-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white border border-yellow-300 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-yellow-800">Signup Complete</h1>
        <p className="text-gray-800 text-center">
          Thanks for signing up! We don’t have your email registered yet.
        </p>
        <p className="text-gray-800 text-center">
          If you believe this is a mistake, please{' '}
          <a href="mailto:support@amtmemorabilia.com" className="text-indigo-600 underline">
            contact us
          </a>.
        </p>
        <p className="text-gray-800 text-center">
          You’ll receive an email once your account is approved.
        </p>
        <div className="text-center pt-4">
          <a href="/login" className="text-indigo-600 hover:text-indigo-800 underline">
            Return to Login
          </a>
        </div>
      </div>
    </div>
  );
}
