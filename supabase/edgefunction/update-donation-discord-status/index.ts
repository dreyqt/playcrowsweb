import { createClient } from 'npm:@supabase/supabase-js@^2'

const DEFAULT_ADMIN_DASHBOARD_URL = 'https://playcrowsweb.vercel.app/admin'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: CORS_HEADERS,
  })
}

function formatDiscordMoney(currency: string, amount: number) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
}

function sanitizeDiscordFilename(name: string, extension: string) {
  const safe = name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120)

  return safe || `receipt.${extension}`
}

function getReceiptExtension(mimeType: string | null) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'application/pdf':
      return 'pdf'
    default:
      return 'bin'
  }
}

function getStatusPresentation(status: string) {
  switch (status) {
    case 'approved':
      return {
        label: '🟢 Approved',
        color: 0x22c55e,
      }
    case 'rejected':
      return {
        label: '🔴 Rejected',
        color: 0xef4444,
      }
    default:
      return {
        label: '🟡 Pending',
        color: 0xf5a623,
      }
  }
}

Deno.serve(async request => {
  // Browser calls with Authorization + JSON trigger a CORS preflight.
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: CORS_HEADERS,
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const defaultWebhookUrl = Deno.env.get('DISCORD_DONATION_WEBHOOK_URL')
  const adminDashboardUrl =
    Deno.env.get('ADMIN_DASHBOARD_URL') || DEFAULT_ADMIN_DASHBOARD_URL

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase environment is not configured.' }, 500)
  }



  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized.' }, 401)
  }

  const accessToken = authorization.slice('Bearer '.length).trim()

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(accessToken)

  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized.' }, 401)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data: adminUser, error: adminError } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminError || !adminUser) {
    return jsonResponse({ error: 'Administrator access required.' }, 403)
  }

  let body: { donationId?: string }

  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON request.' }, 400)
  }

  const donationId = String(body.donationId ?? '').trim()
  if (!donationId) {
    return jsonResponse({ error: 'Donation ID is required.' }, 400)
  }

  const { data: donation, error: donationError } = await adminClient
    .from('donations')
    .select(`
      id,
      server,
      reference_code,
      created_at,
      player_id,
      username,
      currency,
      amount,
      selected_package_amount,
      selected_package_id,
      selected_package_title,
      package_quantity,
      additional_notes,
      payment_method,
      receipt_original_name,
      receipt_mime_type,
      status,
      discord_message_id,
      event_bonus_name,
      event_bonus_eligible
    `)
    .eq('id', donationId)
    .single()

  if (donationError || !donation) {
    return jsonResponse({ error: 'Donation was not found.' }, 404)
  }

  const server = donation.server === 'v2' ? 'v2' : 'v1'
  const webhookUrl = Deno.env.get(`DISCORD_DONATION_WEBHOOK_URL_${server.toUpperCase()}`) || defaultWebhookUrl
  if (!webhookUrl) {
    return jsonResponse({ error: `Discord webhook is not configured for PlayCrows ${server.toUpperCase()}.` }, 500)
  }

  if (!donation.discord_message_id) {
    return jsonResponse(
      {
        error:
          'This donation has no Discord message ID. Older notifications cannot be synchronized automatically.',
      },
      409
    )
  }

  const packageId = donation.selected_package_id ?? ''
  const category = packageId.startsWith('currency-')
    ? 'Currency'
    : packageId.startsWith('august-supply-')
      ? 'August Supply Package'
      : packageId.startsWith('september-supply-')
        ? 'September Supply Package'
        : packageId.startsWith('support-')
          ? 'Support Package'
          : 'Legacy'

  const statusPresentation = getStatusPresentation(donation.status)

  const embed: Record<string, unknown> = {
    title: '🔔 New Donation Submission',
    url: adminDashboardUrl,
    color: statusPresentation.color,
    fields: [
      {
        name: 'Reference',
        value: `\`${donation.reference_code}\``,
        inline: true,
      },
      {
        name: 'Status',
        value: statusPresentation.label,
        inline: true,
      },
      {
        name: 'Server',
        value: `**PlayCrows ${server.toUpperCase()}**`,
        inline: true,
      },
      {
        name: 'Player',
        value: `**${donation.username}**\nID: \`${donation.player_id}\``,
        inline: false,
      },
      {
        name: 'Package',
        value:
          `**${donation.selected_package_title ?? 'Legacy Donation'}**\n` +
          `${category} • $${
            donation.selected_package_amount == null
              ? 'Not recorded'
              : Number(donation.selected_package_amount).toLocaleString()
          } × ${donation.package_quantity ?? 1}`,
        inline: false,
      },
      {
        name: 'Total Paid',
        value: `**${formatDiscordMoney(
          donation.currency,
          Number(donation.amount)
        )}**`,
        inline: true,
      },
      {
        name: 'Payment Method',
        value: String(donation.payment_method ?? '').toUpperCase(),
        inline: true,
      },
      {
        name: 'Additional Notes',
        value: donation.additional_notes || 'None',
        inline: false,
      },
    ],
    footer: {
      text: `PlayCrows ${server.toUpperCase()} Donation Center • Click the title to open Admin Dashboard`,
    },
    timestamp: donation.created_at,
  }

  const oneTimeEventBonus = packageId === 'september-supply-500'
    ? 'Rare Monster Weapon Style SET'
    : packageId === 'september-supply-1000'
      ? 'Epic Monster Weapon Style'
      : null

  if (oneTimeEventBonus) {
    ;(embed.fields as Array<Record<string, unknown>>).push({
      name: '🎁 One-Time Event Bonus',
      value: donation.event_bonus_eligible === true
        ? `**${donation.event_bonus_name ?? oneTimeEventBonus}**\n✅ Reserved for this verified order. Grant exactly once.`
        : donation.event_bonus_eligible === false
          ? `**${donation.event_bonus_name ?? oneTimeEventBonus}**\n⛔ Already claimed by this Player ID. Do NOT grant again.`
          : `**${oneTimeEventBonus}**\n⏳ Eligibility pending payment verification.`,
      inline: false,
    })
  }

  const isImageReceipt = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]).has(donation.receipt_mime_type ?? '')

  if (isImageReceipt && donation.receipt_original_name) {
    const receiptFilename = sanitizeDiscordFilename(
      donation.receipt_original_name,
      getReceiptExtension(donation.receipt_mime_type)
    )

    embed.image = {
      url: `attachment://${receiptFilename}`,
    }
  }

  const baseWebhookUrl = webhookUrl.split('?')[0].replace(/\/$/, '')
  const response = await fetch(
    `${baseWebhookUrl}/messages/${donation.discord_message_id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
        allowed_mentions: {
          parse: [],
        },
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    console.error('Discord edit error:', response.status, errorText)

    return jsonResponse(
      {
        error: `Unable to update Discord notification (${response.status}).`,
      },
      502
    )
  }

  return jsonResponse({
    success: true,
    status: donation.status,
    discordMessageId: donation.discord_message_id,
  })
})