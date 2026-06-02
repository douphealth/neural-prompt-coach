import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/brevo'
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const BREVO_CONNECTION_KEY = Deno.env.get('BREVO_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
  source: z.string().trim().max(64).optional().default('blueprint_download'),
})

const APP_URL = 'https://promptgrade.app'
const BLUEPRINT_URL = `${APP_URL}/promptgrade-blueprint.pdf`

function buildHtml(email: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your PromptGrade Blueprint</title></head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#E5E7EB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0F1A;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#111827;border:1px solid #1F2937;border-radius:16px;overflow:hidden;">
        <tr><td style="height:6px;background:linear-gradient(90deg,#3B82F6,#22D3EE);"></td></tr>
        <tr><td style="padding:36px 36px 8px;">
          <div style="font-size:11px;letter-spacing:2px;color:#22D3EE;font-weight:700;">PROMPTGRADE&trade;</div>
          <h1 style="font-size:28px;line-height:1.2;color:#ffffff;margin:14px 0 8px;font-weight:800;">Your Blueprint is ready.</h1>
          <p style="font-size:15px;line-height:1.6;color:#94A3B8;margin:0 0 22px;">An 18-page field guide to writing prompts that score <strong style="color:#F4C26B;">90+ on the PES&trade;</strong> — frameworks, 12 power patterns, model-specific tuning, and a daily checklist you'll actually use.</p>
          <a href="${BLUEPRINT_URL}" style="display:inline-block;background:#3B82F6;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;font-size:15px;box-shadow:0 8px 20px -8px rgba(59,130,246,0.6);">Download the Blueprint (PDF)</a>
          <p style="font-size:12px;color:#64748B;margin:14px 0 0;">Or copy the link: <a href="${BLUEPRINT_URL}" style="color:#60A5FA;">${BLUEPRINT_URL}</a></p>
        </td></tr>
        <tr><td style="padding:24px 36px;">
          <div style="border-top:1px solid #1F2937;padding-top:22px;">
            <h2 style="font-size:14px;letter-spacing:1px;color:#F4C26B;margin:0 0 14px;text-transform:uppercase;">Try these 3 plays today</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:10px 0;border-bottom:1px solid #1F2937;">
                <div style="color:#ffffff;font-weight:700;font-size:14px;">1. Open with a role</div>
                <div style="color:#94A3B8;font-size:13px;line-height:1.5;">“You are a senior &lt;role&gt; with deep expertise in &lt;domain&gt;.”</div>
              </td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #1F2937;">
                <div style="color:#ffffff;font-weight:700;font-size:14px;">2. Lock the format</div>
                <div style="color:#94A3B8;font-size:13px;line-height:1.5;">Specify markdown, JSON schema, or a table skeleton before the model guesses.</div>
              </td></tr>
              <tr><td style="padding:10px 0;">
                <div style="color:#ffffff;font-weight:700;font-size:14px;">3. Demand a self-check</div>
                <div style="color:#94A3B8;font-size:13px;line-height:1.5;">End with: “Verify against [criteria]. Revise once, then output.”</div>
              </td></tr>
            </table>
          </div>
        </td></tr>
        <tr><td style="padding:8px 36px 32px;">
          <div style="background:#0F1B2E;border:1px solid #1E3A8A;border-radius:12px;padding:20px;">
            <div style="color:#60A5FA;font-weight:700;font-size:13px;margin-bottom:6px;">Want everything unlocked?</div>
            <div style="color:#E5E7EB;font-size:14px;line-height:1.5;margin-bottom:14px;">Multi-model rewrites, prompt chains, masterclass, analytics — one-time <strong>$7.99</strong>, lifetime.</div>
            <a href="${APP_URL}" style="display:inline-block;background:transparent;color:#60A5FA;border:1px solid #3B82F6;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:8px;font-size:13px;">Explore Premium →</a>
          </div>
        </td></tr>
        <tr><td style="padding:18px 36px 28px;border-top:1px solid #1F2937;">
          <p style="color:#64748B;font-size:11px;margin:0;line-height:1.5;">You're receiving this because you requested the Blueprint at promptgrade.app using ${email}. If you didn't request it, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function buildText(email: string) {
  return `Your PromptGrade Blueprint is ready.\n\nDownload (PDF): ${BLUEPRINT_URL}\n\n3 plays to try today:\n1. Open with a role: "You are a senior <role> with deep expertise in <domain>."\n2. Lock the format before the model guesses (markdown / JSON / table skeleton).\n3. End with: "Verify against [criteria]. Revise once, then output."\n\nWant everything unlocked? Multi-model rewrites, prompt chains, masterclass — one-time $7.99, lifetime.\n${APP_URL}\n\n— PromptGrade\n\nSent to ${email}.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing')
    if (!BREVO_CONNECTION_KEY) throw new Error('BREVO_API_KEY missing')

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { email, source } = parsed.data
    const ua = req.headers.get('user-agent') ?? ''

    // Store lead (best-effort; ignore duplicates)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
    await supabase.from('leads').upsert(
      { email, source, user_agent: ua },
      { onConflict: 'email,source', ignoreDuplicates: true }
    )

    // Send via Brevo
    const brevoRes = await fetch(`${GATEWAY_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': BREVO_CONNECTION_KEY,
      },
      body: JSON.stringify({
        sender: { name: 'PromptGrade', email: 'blueprint@promptgrade.app' },
        to: [{ email }],
        replyTo: { email: 'hello@promptgrade.app', name: 'PromptGrade' },
        subject: 'Your PromptGrade Blueprint (PDF inside) 🚀',
        htmlContent: buildHtml(email),
        textContent: buildText(email),
        tags: ['blueprint', 'lead-magnet'],
      }),
    })

    const brevoBody = await brevoRes.text()
    if (!brevoRes.ok) {
      console.error('Brevo error', brevoRes.status, brevoBody)
      // Still return success+download link so the user gets the PDF even if email is delayed
      return new Response(
        JSON.stringify({ ok: true, emailed: false, downloadUrl: BLUEPRINT_URL, warning: 'Email delivery delayed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ ok: true, emailed: true, downloadUrl: BLUEPRINT_URL }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('send-blueprint error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})