/**
 * TypeScript types for Supabase database rows
 */

export interface FilesRow {
  id: string;
  user_id: string;
  filename: string;
  storage_key: string;
  sha256: string;
  size_bytes: number;
  created_at: string;
}

export interface StegoHistoryRow {
  id: string;
  user_id: string;
  original_file_id: string | null;
  stego_file_id: string;
  algorithm: string;
  encrypted: boolean;
  metadata: any;
  created_at: string;
  stego_file?: FilesRow;
  original_file?: FilesRow | null;
}




