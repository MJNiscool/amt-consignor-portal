'use client';
export const dynamic = 'force-dynamic';

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
  const { user, logout } = useAuth();
  const router = useRouter();

  const [ebayItems, setEbayItems] = useState<EbayItem[]>([]);
  const [status, setStatus] = useState<string>('Idle');

  const callFetchEbayData = useCallback(async () => {
    if (!user) {
      setStatus('User not authenticated.');
      return;
    }

    setStatus('Loading...');
    try {
      const consignerId = 'MN234'; // Replace with real logic
      const response = await fetch(`/api/fake-ebay?user=${consignerId}`);
      const data = await response.json();
      setEbayItems(data.items || []);
      setStatus('Loaded.');
    } catch (error) {
      setStatus('Error loading eBay data.');
    }
  }, [user]);

  useEffect(() => {
    callFetchEbayData();
  }, [callFetchEbayData]);

  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      <button onClick={logout}>Log Out</button>
      <p>Status: {status}</p>
      <ul>
        {ebayItems.map((item) => (
          <li key={item.itemId}>
            <strong>{item.title}</strong> — ${item.price} — {item.bids} bids — {item.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
