# StegoHub - Steganography Platform

A React + TypeScript + Tailwind application for encoding and decoding hidden messages in images and audio files with Supabase backend integration.

## Features

- **Steganography Encoding/Decoding**: Support for LSB, DCT (images), and Phase/Echo (audio) algorithms
- **Password Encryption**: Optional AES-GCM encryption before embedding messages
- **Cloud Storage**: Upload encoded files to Supabase Storage
- **History Tracking**: View and decode previously encoded files from your history
- **User Authentication**: Sign up/in with Supabase Auth

## Prerequisites

- Node.js 18+ and npm/yarn/bun
- A Supabase project with:
  - Storage bucket: `stego-files` (private)
  - PostgreSQL tables: `files` and `stego_history`
  - RLS policies enabled

## Environment Variables

Create a `.env.local` file in the project root:

```env
# For Vite (this project)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OR for Create React App (if migrating)
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Setup

### 1. Storage Bucket

Create a private bucket named `stego-files`:

```sql
-- In Supabase Dashboard > Storage > New bucket
-- Name: stego-files
-- Public: false (private)
```

### 2. Database Tables

Run these SQL commands in Supabase SQL Editor:

```sql
-- Files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stego history table
CREATE TABLE stego_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  stego_file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  algorithm TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for files
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own files"
  ON files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
  ON files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
  ON files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON files FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for stego_history
ALTER TABLE stego_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history"
  ON stego_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON stego_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Storage policies (run in Supabase Dashboard > Storage > Policies)
-- Allow authenticated users to upload to their own folder
-- Allow authenticated users to read from their own folder
```

### 3. Storage Policies

In Supabase Dashboard > Storage > Policies for `stego-files`:

**Upload Policy:**
```sql
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stego-files' AND (storage.foldername(name))[1] = auth.uid()::text);
```

**Read Policy:**
```sql
CREATE POLICY "Users can read from own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'stego-files' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## Installation

```bash
npm install
# or
yarn install
# or
bun install
```

## Development

```bash
npm run dev
# or
yarn dev
# or
bun dev
```

## Usage

1. **Sign Up/Sign In**: Create an account or sign in
2. **Encode**: Upload a file, enter a message, optionally enable password encryption, and encode
3. **Upload**: Encoded files are automatically uploaded to Supabase Storage (if authenticated)
4. **History**: View your encoding history in the Profile page
5. **Decode**: Click "Decode" on any history item or upload a file manually
6. **Decrypt**: If the message was encrypted, enter the password to decrypt

## Development Checklist

- [x] Sign up/in with Supabase Auth
- [x] Encode message with optional password encryption
- [x] Upload encoded file to Supabase Storage
- [x] Save history to database
- [x] View history from database
- [x] Decode from history using signed URLs
- [x] Decrypt password-protected messages

## Project Structure

```
src/
├── lib/
│   ├── supabase.ts      # Supabase client
│   ├── auth.ts           # Auth helpers
│   ├── crypto.ts         # AES-GCM encryption
│   ├── uploadFile.ts     # Storage upload/URLs
│   ├── history.ts        # DB operations
│   └── types.ts          # TypeScript types
├── components/
│   ├── StegoEncoder.tsx  # Encoding UI
│   ├── StegoDecoder.tsx  # Decoding UI
│   └── auth/
│       ├── AuthGate.tsx  # Auth wrapper
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
├── contexts/
│   └── AuthContext.tsx    # Auth state management
└── pages/
    ├── Index.tsx         # Main page
    └── Profile.tsx       # History page
```

## Notes

- The app supports both Vite (`VITE_*`) and CRA (`REACT_APP_*`) environment variable prefixes
- Password encryption uses AES-GCM with PBKDF2 key derivation (200,000 iterations)
- Encrypted messages are stored as JSON in the steganography payload
- All file operations respect RLS policies for user isolation
