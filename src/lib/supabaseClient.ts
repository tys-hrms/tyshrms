// src/lib/supabaseClient.ts - Lightweight HTTPS REST client for Supabase
// This ensures 100% compatibility on Netlify without protocol/firewall issues.

const SUPABASE_URL = 'https://mgnvegujawxvqzobnmgj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nbnZlZ3VqYXd4dnF6b2JubWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODQyMDEsImV4cCI6MjA5MDg2MDIwMX0.J-frc7hRoZd8a0veuK-wkBwmYorfLfx8AB52QM-Cz6s';

export async function supabaseRequest(
  table: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  queryParams: Record<string, string> = {},
  body?: any
): Promise<any> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(queryParams).forEach(([key, value]) => url.searchParams.append(key, value));

  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const err = await response.json();
      console.error(`[Supabase Error ${method} on ${table}]:`, err);
      throw new Error(err.message || `Request failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`[Supabase Network Error]:`, error.message);
    throw error;
  }
}
