import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEMO_TRIGGER = "DEMO_TRIGGER";
const MALICIOUS_HASHES = [
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // Example malicious hash
];

// Simple AES-256-GCM encryption using Web Crypto API
async function encryptFile(data: Uint8Array): Promise<{ encrypted: Uint8Array; iv: Uint8Array; key: string }> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data as unknown as ArrayBuffer
  );

  const exportedKey = await crypto.subtle.exportKey("raw", key);
  const keyHex = Array.from(new Uint8Array(exportedKey))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    encrypted: new Uint8Array(encrypted),
    iv,
    key: keyHex
  };
}

async function computeSHA256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const username = formData.get('username') as string;

    if (!file || !username) {
      return new Response(
        JSON.stringify({ error: 'Missing file or username' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File too large (max 2MB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);
    const sha256 = await computeSHA256(fileData);

    console.log(`Scanning file: ${file.name}, SHA-256: ${sha256}`);

    // Check for malicious hash
    if (MALICIOUS_HASHES.includes(sha256)) {
      console.log('Malicious hash detected');
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from('upload_logs').insert({
        username,
        filename: file.name,
        file_size: file.size,
        sha256,
        status: 'malicious',
        storage_path: null
      });

      return new Response(
        JSON.stringify({ 
          status: 'malicious',
          reason: 'SHA-256 hash matches known malware',
          sha256
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for trigger string
    const textContent = new TextDecoder().decode(fileData);
    if (textContent.includes(DEMO_TRIGGER)) {
      console.log('Demo trigger detected in content');
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from('upload_logs').insert({
        username,
        filename: file.name,
        file_size: file.size,
        sha256,
        status: 'malicious',
        storage_path: null
      });

      return new Response(
        JSON.stringify({ 
          status: 'malicious',
          reason: 'File contains malicious trigger pattern',
          sha256
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // File is clean - encrypt and store
    console.log('File is clean, encrypting...');
    const { encrypted, iv, key } = await encryptFile(fileData);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.length);
    combined.set(iv);
    combined.set(encrypted, iv.length);

    const storagePath = `${username}/${sha256}_${file.name}.enc`;
    
    const { error: uploadError } = await supabase.storage
      .from('encrypted-files')
      .upload(storagePath, combined, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Log the upload
    await supabase.from('upload_logs').insert({
      username,
      filename: file.name,
      file_size: file.size,
      sha256,
      status: 'clean',
      storage_path: storagePath
    });

    return new Response(
      JSON.stringify({ 
        status: 'clean',
        sha256,
        storage_path: storagePath,
        encryption_key: key
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scan error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Scan failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});