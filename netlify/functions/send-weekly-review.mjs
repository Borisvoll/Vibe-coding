/**
 * Netlify Function: Send Weekly Review Email
 *
 * Environment variables (set in Netlify dashboard):
 *   RESEND_API_KEY   — API key from resend.com
 *   RECIPIENT_EMAIL  — e.g. borisvoll@hotmail.com
 *   SITE_URL         — e.g. https://boris-os.netlify.app
 *
 * POST body: the aggregated weekly review data from the client.
 */

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const recipientEmail = process.env.RECIPIENT_EMAIL;
  const siteUrl = process.env.SITE_URL || 'https://boris-os.netlify.app';

  if (!apiKey || !recipientEmail) {
    return Response.json(
      { error: 'Server not configured: RESEND_API_KEY and RECIPIENT_EMAIL are required.' },
      { status: 500 }
    );
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const html = buildEmailHtml(data, siteUrl);
  const subject = `BORIS — Week ${data.week || '?'} overzicht`;

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BORIS <onboarding@resend.dev>',
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const body = await resendResponse.text();
      return Response.json(
        { error: `Resend API error: ${resendResponse.status}`, detail: body },
        { status: 502 }
      );
    }

    const result = await resendResponse.json();
    return Response.json({ ok: true, id: result.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

// ─── Email HTML Builder ──────────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEmailHtml(data, siteUrl) {
  const {
    week = '',
    weekStartFormatted = '',
    weekEndFormatted = '',
    completedTasks = [],
    completedTaskCount = 0,
    openTaskCount = 0,
    bpv = {},
    gratitude = [],
    reflections = [],
    journalNotes = [],
    habitsSummary = {},
    activeProjects = [],
    processedInboxCount = 0,
    prompt = '',
  } = data;

  const habitLabels = { water: '💧 Water', movement: '🚶 Bewegen', focus: '🎯 Focus' };

  const habitsHtml = Object.entries(habitsSummary).map(([key, val]) => {
    const pct = val.total > 0 ? Math.round((val.done / val.total) * 100) : 0;
    return `<td style="padding:8px 16px 8px 0;font-size:14px;color:#374151;">
      ${habitLabels[key] || key} <span style="color:#9ca3af;">${val.done}/${val.total} (${pct}%)</span>
    </td>`;
  }).join('');

  const tasksHtml = completedTasks.slice(0, 15).map((t) =>
    `<tr><td style="padding:4px 0;font-size:14px;color:#374151;">
      <span style="color:#10b981;margin-right:6px;">✓</span>${esc(t.text)}
      <span style="color:#9ca3af;font-size:12px;margin-left:4px;">${esc(t.mode || '')}</span>
    </td></tr>`
  ).join('');

  const gratitudeHtml = gratitude.map((g) =>
    `<tr><td style="padding:4px 0;font-size:14px;color:#374151;">
      <span style="color:#f59e0b;margin-right:6px;">✦</span>${esc(g.text)}
    </td></tr>`
  ).join('');

  const reflectionsHtml = reflections.map((r) =>
    `<tr><td style="padding:6px 0;font-size:14px;color:#374151;line-height:1.5;">
      <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${esc(r.date)}</span>
      ${esc(r.text)}
    </td></tr>`
  ).join('');

  const journalHtml = journalNotes.map((j) =>
    `<tr><td style="padding:6px 0;font-size:14px;color:#374151;line-height:1.5;border-left:3px solid #e5e7eb;padding-left:12px;">
      <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${esc(j.date)}</span>
      ${esc(j.text)}
    </td></tr>`
  ).join('');

  const projectsHtml = activeProjects.map((p) =>
    `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#f3effe;color:#8b5cf6;font-size:13px;font-weight:500;margin:2px 4px 2px 0;">${esc(p.title)}</span>`
  ).join('');

  const bpvPct = bpv.percentComplete || 0;
  const bpvColor = bpvPct >= 80 ? '#10b981' : bpvPct >= 50 ? '#f59e0b' : '#f43f5e';

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f8;padding:24px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

<!-- Header -->
<tr><td style="padding:32px 32px 24px;border-bottom:1px solid #e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><span style="font-size:20px;font-weight:700;color:#1f1f1f;letter-spacing:-0.02em;">BORIS</span></td>
    <td align="right"><span style="font-size:13px;color:#9ca3af;">Weekoverzicht</span></td>
  </tr></table>
  <p style="margin:12px 0 0;font-size:15px;color:#6b6b6b;">
    ${esc(week)} &middot; ${esc(weekStartFormatted)} — ${esc(weekEndFormatted)}
  </p>
</td></tr>

<!-- Stats Row -->
<tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td align="center" style="padding:8px;">
      <div style="font-size:28px;font-weight:700;color:#1f1f1f;">${completedTaskCount}</div>
      <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">taken klaar</div>
    </td>
    <td align="center" style="padding:8px;">
      <div style="font-size:28px;font-weight:700;color:${bpvColor};">${esc(bpv.formattedTotal || '0u')}</div>
      <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">BPV-uren</div>
    </td>
    <td align="center" style="padding:8px;">
      <div style="font-size:28px;font-weight:700;color:#1f1f1f;">${processedInboxCount}</div>
      <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">verwerkt</div>
    </td>
  </tr></table>
</td></tr>

<!-- BPV Progress Bar -->
${bpv.totalMinutes > 0 ? `
<tr><td style="padding:16px 32px;border-bottom:1px solid #e5e7eb;">
  <div style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">BPV Voortgang</div>
  <div style="background:#e5e7eb;border-radius:999px;height:6px;overflow:hidden;">
    <div style="background:${bpvColor};height:100%;border-radius:999px;width:${Math.min(100, bpvPct)}%;"></div>
  </div>
  <div style="font-size:13px;color:#6b6b6b;margin-top:6px;">${esc(bpv.formattedTotal || '0u')} / ${esc(bpv.formattedTarget || '40u')} (${bpvPct}%)</div>
</td></tr>
` : ''}

<!-- Completed Tasks -->
${tasksHtml ? `
<tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
  <div style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Afgeronde taken</div>
  <table width="100%" cellpadding="0" cellspacing="0">${tasksHtml}</table>
  ${completedTaskCount > 15 ? `<div style="font-size:13px;color:#9ca3af;margin-top:8px;">+ ${completedTaskCount - 15} meer</div>` : ''}
  ${openTaskCount > 0 ? `<div style="font-size:13px;color:#9ca3af;margin-top:8px;">${openTaskCount} taken nog open</div>` : ''}
</td></tr>
` : ''}

<!-- Habits -->
${habitsHtml ? `
<tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
  <div style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Gewoontes</div>
  <table cellpadding="0" cellspacing="0"><tr>${habitsHtml}</tr></table>
</td></tr>
` : ''}

<!-- Gratitude -->
${gratitudeHtml ? `
<tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
  <div style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Dankbaarheid</div>
  <table width="100%" cellpadding="0" cellspacing="0">${gratitudeHtml}</table>
</td></tr>
` : ''}

<!-- Reflections -->
${reflectionsHtml ? `
<tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
  <div style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Reflecties</div>
  <table width="100%" cellpadding="0" cellspacing="0">${reflectionsHtml}</table>
</td></tr>
` : ''}

<!-- Journal -->
${journalHtml ? `
<tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
  <div style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Dagboek</div>
  <table width="100%" cellpadding="0" cellspacing="0">${journalHtml}</table>
</td></tr>
` : ''}

<!-- Projects -->
${projectsHtml ? `
<tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
  <div style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Actieve projecten</div>
  <div>${projectsHtml}</div>
</td></tr>
` : ''}

<!-- Emotional Prompt -->
<tr><td style="padding:28px 32px;border-bottom:1px solid #e5e7eb;background:#fafaf9;">
  <div style="font-size:13px;color:#10b981;font-weight:600;margin-bottom:8px;">Even stilstaan</div>
  <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;font-style:italic;">
    "${esc(prompt)}"
  </p>
  <p style="margin:12px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
    Neem een moment. Niet wat je deed, maar hoe het voelde. Elke emotie — ook de lastige — is informatie over wat belangrijk voor je is.
  </p>
</td></tr>

<!-- CTA -->
<tr><td align="center" style="padding:28px 32px;">
  <a href="${esc(siteUrl)}" style="display:inline-block;padding:12px 28px;background:#4f6ef7;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Open BORIS</a>
  <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Je data staat lokaal op je apparaat. Deze email is een momentopname.</p>
</td></tr>

</table>

<!-- Footer -->
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin-top:16px;">
<tr><td align="center" style="padding:8px;font-size:12px;color:#9ca3af;">
  BORIS — Personal OS &middot; Lokaal & privé
</td></tr>
</table>

</td></tr>
</table>
</body>
</html>`;
}
