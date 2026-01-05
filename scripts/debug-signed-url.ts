
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignedUrl() {
    // Simulate the logic in the page
    // Example Public URL from a typical Supabase bucket
    const mockPublicUrl = `${supabaseUrl}/storage/v1/object/public/documents/user_123/selfie-123.jpg`;

    // Original Logic
    const getPath = (url: string) => {
        if (!url) return '';
        try {
            const parts = url.split('/documents/');
            return parts.length > 1 ? decodeURIComponent(parts[1]) : '';
        } catch (e) { return '' }
    }

    const extractedPath = getPath(mockPublicUrl);
    console.log("Mock URL:", mockPublicUrl);
    console.log("Extracted Path:", extractedPath);

    if (!extractedPath) {
        console.error("❌ Failed to extract path");
        return;
    }

    console.log("Generating Signed URL...");
    const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(extractedPath, 60);

    if (error) {
        console.error("❌ Supabase Error:", error.message);
    } else {
        console.log("✅ Signed URL Generated:", data.signedUrl);
        // Try to fetch it
        console.log("Fetching Signed URL...");
        const res = await fetch(data.signedUrl);
        console.log("Fetch Status:", res.status, res.statusText);
    }
}

testSignedUrl();
