type ListingEmail = {
  to: string;
  subject: string;
  text: string;
};

export async function sendListingEmail(apiKey: string | undefined, key: string, email: ListingEmail) {
  if (!apiKey) {
    console.warn('Listing email unavailable: RESEND_API_KEY is missing', key);
    return;
  }

  const body = JSON.stringify({ from: 'ASETEMYT <noreply@asetemyt.com>', ...email, to: [email.to] });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return;
      if (response.status < 500 || attempt === 1) {
        console.warn('Listing email rejected', key, response.status);
        return;
      }
    } catch {
      if (attempt === 1) console.warn('Listing email unavailable', key);
    }
  }
}
