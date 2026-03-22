/**
 * Cloudflare Pages Function — POST /api/contact
 * Set CONTACT_WEBHOOK_URL in Pages env to forward JSON to Zapier/Make/Slack/etc.
 */
interface Env {
  CONTACT_WEBHOOK_URL?: string;
}

type PagesHandler = (context: { request: Request; env: Env }) => Promise<Response>;

export const onRequestPost: PagesHandler = async ({ request, env }) => {

  try {
    const contentType = request.headers.get('content-type') || '';
    let name = '';
    let email = '';
    let subject = '';
    let message = '';

    let locale = 'fr';

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as Record<string, string>;
      name = String(body.name ?? '').trim();
      email = String(body.email ?? '').trim();
      subject = String(body.subject ?? '').trim();
      message = String(body.message ?? '').trim();
      locale = body.locale === 'en' ? 'en' : 'fr';
    } else {
      const form = await request.formData();
      name = String(form.get('name') ?? '').trim();
      email = String(form.get('email') ?? '').trim();
      subject = String(form.get('subject') ?? '').trim();
      message = String(form.get('message') ?? '').trim();
    }

    if (!name || !email || !subject || !message) {
      return Response.json({
        ok: false,
        error: locale === 'en' ? 'Missing required fields.' : 'Champs requis manquants.',
      }, { status: 400 });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return Response.json({
        ok: false,
        error: locale === 'en' ? 'Invalid email address.' : 'Courriel invalide.',
      }, { status: 400 });
    }

    const payload = {
      name,
      email,
      subject,
      message,
      locale,
      source: 'academie-evolution.com',
      at: new Date().toISOString(),
    };

    if (env.CONTACT_WEBHOOK_URL) {
      await fetch(env.CONTACT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    return Response.json({
      ok: true,
      message:
        locale === 'en'
          ? 'Thanks — your message was sent.'
          : 'Merci — ton message a bien été envoyé.',
    });
  } catch {
    return Response.json(
      { ok: false, error: 'Server error.' },
      { status: 500 },
    );
  }
};
