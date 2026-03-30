import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = "BItE7C-Iq-Y9v5tZj_ZHB4eqtyU67b9fvBUQwJFvucUrLrT8y0ZtvxKQdcFqvFhVt6Kx5nxY8it2_nnU7VAEmM8";
const VAPID_PRIVATE_KEY = "hd1xY4GPv68FvIew1yPLOdZBC6R0P0Wkt_JisvFihfQ";

async function sendPushNotification(subscription: { endpoint: string; keys_p256dh: string; keys_auth: string }, payload: string) {
  // Use web-push compatible manual push
  const { default: webpush } = await import("https://esm.sh/web-push@3.6.7");

  webpush.setVapidDetails("mailto:sarahsnails2308@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys_p256dh,
        auth: subscription.keys_auth,
      },
    },
    payload
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { title, body } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const payload = JSON.stringify({ title, body });
    let sent = 0;
    const failed: string[] = [];

    for (const sub of subscriptions) {
      try {
        await sendPushNotification(sub, payload);
        sent++;
      } catch (err: any) {
        // Remove invalid subscriptions (410 Gone, 404)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        failed.push(sub.id);
      }
    }

    return new Response(JSON.stringify({ sent, failed: failed.length }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
