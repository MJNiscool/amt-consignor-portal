'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface EbayItem {
  itemId: string;
  title: string;
  price: number;
  bids: number;
  status: string;
  consignerId: string;
}

export default function DashboardPage() {
  const { user, logout, loadingAuth } = useAuth();
  const router = useRouter();

  const [ebayItems, setEbayItems] = useState<EbayItem[]>([]);
  const [status, setStatus] = useState<string>('Idle');
  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(typeof window !== 'undefined');
  }, []);

  const callFetchEbayData = useCallback(async () => {
    if (!user) {
      setStatus('User not authenticated.');
      return;
    }

    setStatus('Loading...');
    try {
      const consignerId = 'MN234';
      const response = await fetch(
        `https://us-central1-consign-demo-mjn.cloudfunctions.net/fetchEbayListings?consignerId=${consignerId}`
      );
      const data = await response.json();
      setEbayItems(data.items || []);
      setStatus('Loaded successfully.');
    } catch (error) {
      console.error('Error fetching eBay data:', error);
      setStatus('Failed to load data.');
    }
  }, [user]);

  useEffect(() => {
    if (isClient) {
      callFetchEbayData();
    }
  }, [isClient, callFetchEbayData]);

  if (!isClient) return null;

  if (loadingAuth) return <p>Loading authentication...</p>;
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Welcome, {user.email}</h1>
      <p>Status: {status}</p>
      <button onClick={logout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">
        Logout
      </button>
      <div className="mt-6">
        {ebayItems.length === 0 ? (
          <p>No items found.</p>
        ) : (
          <table className="w-full table-auto border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Item ID</th>
                <th className="border px-2 py-1">Title</th>
                <th className="border px-2 py-1">Price</th>
                <th className="border px-2 py-1">Bids</th>
                <th className="border px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {ebayItems.map((item) => (
                <tr key={item.itemId}>
                  <td className="border px-2 py-1">{item.itemId}</td>
                  <td className="border px-2 py-1">{item.title}</td>
                  <td className="border px-2 py-1">${item.price}</td>
                  <td className="border px-2 py-1">{item.bids}</td>
                  <td className="border px-2 py-1">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
