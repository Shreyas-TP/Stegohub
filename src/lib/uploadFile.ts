import { supabase } from "./supabase";

function sanitizeName(name: string) {
  // keep it simple & safe for storage keys
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function uploadFile(file: File) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const userId = userData.user.id;
  const safeName = sanitizeName(file.name);
  const key = `${userId}/${crypto.randomUUID()}_${safeName}`;

  // --- DEBUG: list buckets once to verify we're in the right project ---
  // Remove after testing.
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    console.log("Buckets visible to client:", buckets?.map(b => b.name));
  } catch (e) {
    console.warn("Could not list buckets:", e);
  }

  const { error: upErr } = await supabase.storage
    .from("stego-files") // <-- make sure bucket name matches exactly in Supabase
    .upload(key, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (upErr) {
    console.error("Upload failed:", upErr);
    // Surface a clearer message
    if ((upErr as any)?.message?.toLowerCase?.().includes("bucket not found")) {
      throw new Error(
        "Upload failed: Storage bucket 'stego-files' not found. Create it in Supabase → Storage, or change the bucket name in code."
      );
    }
    throw upErr;
  }

  // SHA-256 hash for integrity
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const sha256 = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data: row, error: dbErr } = await supabase
    .from("files")
    .insert({
      user_id: userId,
      filename: file.name,
      storage_key: key,
      sha256,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (dbErr) throw dbErr;
  return row;
}

export async function createSignedUrl(storage_key: string, expires = 3600) {
  const { data, error } = await supabase.storage
    .from("stego-files") // <-- same bucket name here
    .createSignedUrl(storage_key, expires);

  if (error) throw error;
  return data.signedUrl;
}


