import { supabase } from './supabase';

export async function saveStegoHistory(params: {
  original_file_id?: string | null;
  stego_file_id: string;
  algorithm: string;
  encrypted: boolean;
  metadata?: any;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('stego_history')
    .insert({
      user_id: userId,
      ...params
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function fetchHistory() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('stego_history')
    .select('*, stego_file:stego_file_id(*), original_file:original_file_id(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data ?? [];
}




