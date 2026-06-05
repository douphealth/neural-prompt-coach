import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// CSS styles for premium, responsive emails
const EMAIL_CSS = `
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding: 40px 0; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); }
  .header { background-color: #0f172a; padding: 32px; text-align: center; }
  .logo { font-size: 20px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px; }
  .logo span { color: #10b981; }
  .content { padding: 40px 32px; }
  .h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 16px; text-align: center; }
  .lead { font-size: 16px; color: #64748b; line-height: 1.6; margin-bottom: 24px; text-align: center; }
  .badge-container { text-align: center; margin-bottom: 32px; }
  .badge { display: inline-block; background-color: #10b981; color: #ffffff; font-weight: 800; font-size: 28px; padding: 12px 28px; border-radius: 12px; border: 2px solid #047857; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
  .stats-grid { margin-bottom: 32px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .stat-row { display: flex; border-bottom: 1px solid #e2e8f0; }
  .stat-row:last-child { border-bottom: none; }
  .stat-label { flex: 1; padding: 12px 16px; font-size: 14px; font-weight: 600; color: #475569; background-color: #f1f5f9; }
  .stat-val { padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; font-family: monospace; }
  .panel { padding: 20px; border-radius: 12px; margin-bottom: 24px; }
  .panel-original { background-color: #fef2f2; border: 1px solid #fecaca; }
  .panel-optimized { background-color: #f0fdf4; border: 1px solid #bbf7d0; }
  .panel-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .panel-title-orig { color: #dc2626; }
  .panel-title-opt { color: #15803d; }
  .panel-body { font-size: 13px; line-height: 1.6; white-space: pre-wrap; font-family: monospace; color: #334155; }
  .button-container { text-align: center; margin: 32px 0 16px 0; }
  .button { display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); }
  .footer { background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-t: 1px solid #e2e8f0; }
  .footer p { font-size: 12px; color: #94a3b8; margin: 0 0 8px 0; }
  .footer a { color: #10b981; text-decoration: none; font-weight: 600; }
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, prompt, result } = await req.json();

    if (!email || !prompt || !result) {
      throw new Error("Missing required fields: email, prompt, or result");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not defined. Simulating successful email sequence dispatch in sandbox.");
      return new Response(JSON.stringify({ success: true, message: "Sandbox Mode: Email sequence triggered successfully!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Helper to extract a topic
    const words = prompt.split(/\s+/);
    const topicWords = words.filter((w: string) => w.length > 3 && !['write', 'create', 'make', 'about', 'that', 'this', 'with', 'from', 'have', 'will', 'would', 'could', 'should', 'please', 'help'].includes(w.toLowerCase()));
    const topic = topicWords.slice(0, 3).join(' ') || 'your request';

    // ----------------------------------------------------
    // EMAIL 1 TEMPLATE: Immediate Prompt Audit Report
    // ----------------------------------------------------
    const email1Html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Prompt Audit Report</title>
        <style>${EMAIL_CSS}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo">PromptGrade<span>™</span></div>
            </div>
            <div class="content">
              <h1 class="h1">Your Prompt Audit Report</h1>
              <p class="lead">We analyzed your prompt about "<strong>${topic}</strong>". Here is your detailed analysis and engineered optimization.</p>
              
              <div class="badge-container">
                <div class="badge">PES™ ${result.overallScore} / ${result.grade}</div>
              </div>

              <div class="stats-grid">
                ${result.dimensions.map((d: any) => `
                  <div class="stat-row">
                    <div class="stat-label">${d.emoji} ${d.label}</div>
                    <div class="stat-val">${d.score}/100</div>
                  </div>
                `).join('')}
              </div>

              <div class="panel panel-original">
                <div class="panel-title panel-title-orig">Original Prompt</div>
                <div class="panel-body">${prompt}</div>
              </div>

              <div class="panel panel-optimized">
                <div class="panel-title panel-title-opt">Engineered Rewrite</div>
                <div class="panel-body">${result.rewrite}</div>
              </div>

              <div class="button-container">
                <a href="https://promptgrade.efficientgptprompts.com" class="button">Open My Workbench</a>
              </div>
            </div>
            <div class="footer">
              <p>PromptGrade™ by <a href="https://efficientgptprompts.com">EfficientGPTPrompts.com</a></p>
              <p>© ${new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // ----------------------------------------------------
    // EMAIL 2 TEMPLATE: Day 2 Prompt Blueprint Lesson
    // ----------------------------------------------------
    const email2Html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Prompt Blueprint: Master the 8 Core Elements</title>
        <style>${EMAIL_CSS}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo">PromptGrade<span>™</span></div>
            </div>
            <div class="content">
              <h1 class="h1">Chapter 1: The Prompt Blueprint</h1>
              <p class="lead">Yesterday you audited your prompt. Today, we break down the <strong>8 Core Elements</strong> of the PromptGrade™ Blueprint framework.</p>
              
              <div style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                <p>To write high-scoring, reliable prompts, anchor your template around these three foundational pillars:</p>
                <ol style="padding-left: 20px; margin-bottom: 24px;">
                  <li style="margin-bottom: 8px;"><strong>Role (🎭)</strong>: Establish WHO the model is representing. (e.g. "You are an elite software reviewer...")</li>
                  <li style="margin-bottom: 8px;"><strong>Context (🌍)</strong>: Explain the target scenario and business criteria.</li>
                  <li style="margin-bottom: 8px;"><strong>Guardrails (🛡️)</strong>: Define strict negative constraints. (e.g. "Do not offer generic advice. Focus strictly on...")</li>
                </ol>
              </div>

              <div class="panel panel-optimized">
                <div class="panel-title panel-title-opt">Megaprompt Outline Example</div>
                <div class="panel-body"># ROLE\nYou are a senior technical writer...\n\n# CONTEXT\nWe are building a clean-code TypeScript framework...\n\n# TARGET TASK\nWrite documentation for the billing portal...\n\n# CONSTRAINTS\n- AVOID corporate jargon.\n- Output valid Markdown format.</div>
              </div>

              <div class="button-container">
                <a href="https://promptgrade.efficientgptprompts.com" class="button">Go to Masterclass</a>
              </div>
            </div>
            <div class="footer">
              <p>You are receiving this as part of your PromptGrade™ audit.</p>
              <p>© ${new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // ----------------------------------------------------
    // EMAIL 3 TEMPLATE: Day 3 Prompt Chaining
    // ----------------------------------------------------
    const email3Html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Prompt Chaining: Multi-Agent Workflows</title>
        <style>${EMAIL_CSS}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo">PromptGrade<span>™</span></div>
            </div>
            <div class="content">
              <h1 class="h1">Chapter 2: Prompt Chaining</h1>
              <p class="lead">Final Lesson: How to orchestrate sequential, multi-agent AI pipelines for complex deliverables.</p>
              
              <div style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                <p>When tasks are too complex (e.g., writing full-stack code or strategic analysis), stuffing all instructions into a single prompt degrades quality. The solution is <strong>Chaining</strong>:</p>
                <ul style="padding-left: 20px; margin-bottom: 24px;">
                  <li style="margin-bottom: 8px;"><strong>Step 1</strong>: Extract and outline facts from source docs.</li>
                  <li style="margin-bottom: 8px;"><strong>Step 2</strong>: Feed Step 1 output into a strategy outline.</li>
                  <li style="margin-bottom: 8px;"><strong>Step 3</strong>: Feed Step 2 outline into a senior editor to write final draft.</li>
                </ul>
              </div>

              <div class="button-container">
                <a href="https://promptgrade.efficientgptprompts.com" class="button">Open Pipeline Designer</a>
              </div>
            </div>
            <div class="footer">
              <p>You completed your 3-day prompt coaching sequence!</p>
              <p>© ${new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Dispatch requests to Resend using Deno fetch
    const sendEmail = async (subject: string, html: string, scheduledAt?: string) => {
      const payload: any = {
        from: "PromptGrade™ <coach@promptgrade.efficientgptprompts.com>",
        to: [email],
        subject: subject,
        html: html,
      };

      if (scheduledAt) {
        payload.scheduled_at = scheduledAt;
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Resend API Error: ${errText}`);
      }

      return await res.json();
    };

    // 1. Dispatch Audit Report (Instant)
    console.log(`Dispatching instant audit report to: ${email}`);
    const email1Result = await sendEmail(`Your Prompt Audit Report (Score: ${result.overallScore}/100)`, email1Html);

    // 2. Schedule Day 2 Lesson (24 hours later)
    const day2Date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    console.log(`Scheduling Day 2 Lesson to: ${email} at ${day2Date}`);
    const email2Result = await sendEmail("Prompt Blueprint: 3 Elements to Double Your AI Performance", email2Html, day2Date);

    // 3. Schedule Day 3 Lesson (48 hours later)
    const day3Date = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    console.log(`Scheduling Day 3 Lesson to: ${email} at ${day3Date}`);
    const email3Result = await sendEmail("Prompt Chaining: Build Sequential AI Pipelines", email3Html, day3Date);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sequence scheduled successfully!",
        data: { email1Result, email2Result, email3Result }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Deno execution error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
