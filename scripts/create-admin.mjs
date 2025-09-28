import { createClient } from "@supabase/supabase-js";

const url = "https://nyvlduolesgnomyaljdi.supabase.co";        // EXACT Project URL
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55dmxkdW9sZXNnbm9teWFsamRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgzNzI4MywiZXhwIjoyMDc0NDEzMjgzfQ.ZCL-eBjVmkGjctkcqnxpxT7U-3iV576r5_gZs9Czn_M";                // service_role secret
const email = "shawnie1019@yahoo.com";
const password = "Jaipapachris0326!";

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

console.log("DATA:", data);
console.log("ERROR:", error);
