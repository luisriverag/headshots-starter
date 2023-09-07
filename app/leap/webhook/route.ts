import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic'

const resendApiKey = process.env.RESEND_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!resendApiKey) {
  throw new Error("MISSING RESEND_API_KEY!");
}

if (!supabaseUrl) {
  throw new Error("MISSING NEXT_PUBLIC_SUPABASE_URL!");
}

if (!supabaseServiceRoleKey) {
  throw new Error("MISSING NEXT_PUBLIC_SUPABASE_ANON_KEY!");
}

export async function POST(request: Request) {
  const resend = new Resend(resendApiKey);
  const incomingData = await request.json();
  const { result } = incomingData;
  const urlObj = new URL(request.url);
  const user_id = urlObj.searchParams.get('user_id');

  if (!user_id) {
    return NextResponse.json({}, { status: 500, statusText: "Malformed URL, no user_id detected!" });
  }

  const supabase = createClient(supabaseUrl as string, supabaseServiceRoleKey as string, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  const { data: { user }, error } = await supabase.auth.admin.getUserById(user_id);

  if (error) {
    return NextResponse.json({}, { status: 401, statusText: error.message, })
  }

  if (!user) {
    return NextResponse.json({}, { status: 401, statusText: "User not found!" })
  }

  console.log({ user_id, user, result });

  try {
    switch (result.status) {
      case "finished":
        // Send Email
        await resend.emails.send({
          from: 'noreply@headshots.tryleap.ai',
          to: user?.email ?? "",
          subject: 'Your model was successfully trained!',
          html: `<h2>We're writing to notify you that your model training was successful!</h2>`
        });
      case "failed":
        // Send Email
        await resend.emails.send({
          from: 'noreply@headshots.tryleap.ai',
          to: user?.email ?? "",
          subject: 'Your model failed to train!',
          html: `<h2>We're writing to notify you that your model training failed!.</h2>`
        });
      default:
        // Send Email
        null;
    }
    return NextResponse.json({
      message: "success"
    }, { status: 200, statusText: "Success" })
  } catch (e) {
    console.log(e);
    return NextResponse.json({
      message: "Something went wrong!"
    }, { status: 500, statusText: "Something went wrong!" })
  }
}
