// src/app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-cover bg-center text-white"
      style={{ backgroundImage: 'url("/images/legends-bg.jpg?v=2")' }}
    >
      <div className="bg-black bg-opacity-60 p-8 rounded-lg text-center max-w-2xl mx-4">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Welcome to the AMT Memorabilia Consignor Portal
        </h1>

        <p className="text-lg sm:text-xl mb-8">
          Access your personalized dashboard to track the status and performance
          of your consigned items listed on our eBay store.
        </p>

        <Link
          href="/login"
          className="inline-block px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-md shadow-md hover:bg-blue-700 transition-colors duration-200"
        >
          Consignor Login
        </Link>
      </div>
    </main>
  );
}
