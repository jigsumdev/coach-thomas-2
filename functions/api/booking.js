const LIMITS = Object.freeze({
  maxBodyBytes: 10 * 1024,
  maxEmailLength: 254,
  maxNameLength: 120,
  maxNoteLength: 2000,
  maxPathLength: 200,
});

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getJsonSizeInBytes(payload) {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

function sanitize(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendBookingEmail(env, payload) {
  const recipient = sanitize(
    env.BOOKING_RECIPIENT_EMAIL || 'moarbetsy@gmail.com',
    LIMITS.maxEmailLength,
  );
  const fromEmail = sanitize(
    env.BOOKING_FROM_EMAIL || 'noreply@academie-evolution.com',
    LIMITS.maxEmailLength,
  );

  const text = [
    'New consultation booking request',
    '',
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Date: ${payload.date}`,
    `Time: ${payload.time}`,
    `Source page: ${payload.sourcePath}`,
    '',
    `Note: ${payload.note || '(none)'}`,
  ].join('\n');

  const mailChannelsResponse = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: {
        subject: `Consultation request - ${payload.name}`,
        text,
      },
      personalizations: [{ to: [{ email: recipient }] }],
      from: {
        email: fromEmail,
        name: 'Academie Evolution',
      },
      reply_to: {
        email: payload.email,
        name: payload.name,
      },
    }),
  });

  if (!mailChannelsResponse.ok) {
    const errorText = await mailChannelsResponse.text();
    throw new Error(`MailChannels error: ${errorText || mailChannelsResponse.status}`);
  }
}

export async function onRequestPost({ request, env }) {
  let body = null;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const payload = {
    name: sanitize(body?.name, LIMITS.maxNameLength),
    email: sanitize(body?.email, LIMITS.maxEmailLength),
    note: sanitize(body?.note, LIMITS.maxNoteLength),
    date: sanitize(body?.date, 120),
    time: sanitize(body?.time, 80),
    sourcePath: sanitize(body?.sourcePath, LIMITS.maxPathLength),
  };

  if (!payload.name || !payload.email || !payload.date || !payload.time || !payload.sourcePath) {
    return jsonResponse({ error: 'Missing required fields.' }, 400);
  }

  if (!isValidEmail(payload.email)) {
    return jsonResponse({ error: 'Invalid email.' }, 400);
  }

  if (getJsonSizeInBytes(payload) > LIMITS.maxBodyBytes) {
    return jsonResponse({ error: 'Payload too large.' }, 413);
  }

  try {
    await sendBookingEmail(env, payload);
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Booking email failed:', error instanceof Error ? error.message : String(error));
    return jsonResponse({ error: 'Could not send booking request.' }, 502);
  }
}
