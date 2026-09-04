import { withSupabase } from 'npm:@supabase/server@^1'

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024
const MAX_PACKAGE_QUANTITY = 999
const MAX_ADDITIONAL_NOTES_LENGTH = 1000

const ALLOWED_RECEIPT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

const ALLOWED_CURRENCIES = new Set([
  'USD',
  'PHP',
  'GBP',
])

const ALLOWED_PAYMENT_METHODS = new Set([
  'paypal',
  'paddle',
  'gcash',
  'wise',
  'bybit',
])

const FILE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}



const DEFAULT_ADMIN_DASHBOARD_URL = 'https://playcrowsweb.vercel.app/admin'

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

async function sendDiscordDonationNotification(options: {
  webhookUrl: string
  adminDashboardUrl: string
  donation: {
    referenceCode: string
    createdAt: string
    eventBonusName: string | null
    eventBonusEligible: boolean | null
  }
  server: PlayCrowsServer
  playerId: string
  username: string
  currency: string
  finalAmount: number
  selectedPackageId: string
  selectedPackageTitle: string
  selectedPackageAmount: number
  packageQuantity: number
  paymentMethod: string
  additionalNotes: string
  receipt: File | null
  receiptExtension: string | null
}) {
  const {
    webhookUrl,
    adminDashboardUrl,
    donation,
    server,
    playerId,
    username,
    currency,
    finalAmount,
    selectedPackageId,
    selectedPackageTitle,
    selectedPackageAmount,
    packageQuantity,
    paymentMethod,
    additionalNotes,
    receipt,
    receiptExtension,
  } = options

  const category = selectedPackageId.startsWith('currency-')
    ? 'Currency'
    : selectedPackageId.startsWith('august-supply-')
      ? 'August Supply Package'
      : selectedPackageId.startsWith('september-supply-')
        ? 'September Supply Package'
        : 'Support Package'

  const receiptFilename = receipt && receiptExtension
    ? sanitizeDiscordFilename(receipt.name, receiptExtension)
    : null

  const isImageReceipt = Boolean(receipt && new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]).has(receipt.type))

  const embed: Record<string, unknown> = {
    title: '🔔 New Donation Submission',
    url: adminDashboardUrl,
    color: 0x66d4ff,
    fields: [
      {
        name: 'Reference',
        value: `\`${donation.referenceCode}\``,
        inline: true,
      },
      {
        name: 'Status',
        value: paymentMethod === 'paddle' || paymentMethod === 'paypal' ? '✅ Paid · 🟡 Pending Fulfillment' : '🟡 Pending',
        inline: true,
      },
      {
        name: 'Server',
        value: `**PlayCrows ${server.toUpperCase()}**`,
        inline: true,
      },
      {
        name: 'Player',
        value: `**${username}**\nID: \`${playerId}\``,
        inline: false,
      },
      {
        name: 'Package',
        value:
          `**${selectedPackageTitle}**\n` +
          `${category} • $${selectedPackageAmount.toLocaleString()} × ${packageQuantity}`,
        inline: false,
      },
      {
        name: 'Total Paid',
        value: `**${formatDiscordMoney(currency, finalAmount)}**`,
        inline: true,
      },
      {
        name: 'Payment Method',
        value: paymentMethod.toUpperCase(),
        inline: true,
      },
      {
        name: 'Additional Notes',
        value: additionalNotes || 'None',
        inline: false,
      },
    ],
    footer: {
      text: `PlayCrows ${server.toUpperCase()} Donation Center • Click the title to open Admin Dashboard`,
    },
    timestamp: donation.createdAt,
  }

  if (isImageReceipt && receiptFilename) {
    embed.image = {
      url: `attachment://${receiptFilename}`,
    }
  }

  const oneTimeEventBonus = selectedPackageId === 'september-supply-500'
    ? 'Rare Monster Weapon Style SET'
    : selectedPackageId === 'september-supply-1000'
      ? 'Epic Monster Weapon Style'
      : null

  if (oneTimeEventBonus) {
    ;(embed.fields as Array<Record<string, unknown>>).push({
      name: '🎁 One-Time Event Bonus',
      value: donation.eventBonusEligible === true
        ? `**${oneTimeEventBonus}**\n✅ Reserved for this verified order. Grant exactly once regardless of package quantity.`
        : donation.eventBonusEligible === false
          ? `**${oneTimeEventBonus}**\n⛔ Already claimed by this Player ID. Do NOT grant this event bonus again.`
          : `**${oneTimeEventBonus}**\n⏳ Payment is not verified yet. Supabase will lock eligibility when verification is saved.`,
      inline: false,
    })
  }

  if (paymentMethod === 'paddle') {
    ;(embed.fields as Array<Record<string, unknown>>).push({
      name: 'Verification',
      value: '✅ Server-verified by Paddle webhook',
      inline: false,
    })
  } else if (paymentMethod === 'paypal') {
    ;(embed.fields as Array<Record<string, unknown>>).push({
      name: 'Verification',
      value: '✅ Server-verified directly with PayPal',
      inline: false,
    })
  }

  const payload: Record<string, unknown> = {
    content: '@here',
    username: 'PlayCrows Donation Center',
    embeds: [embed],
    allowed_mentions: { parse: ['everyone'] },
  }

  let response: Response
  if (receipt && receiptFilename) {
    payload.attachments = [{
      id: 0,
      filename: receiptFilename,
      description: `Payment receipt for ${donation.referenceCode}`,
    }]
    const discordBody = new FormData()
    discordBody.append('payload_json', JSON.stringify(payload))
    discordBody.append('files[0]', receipt, receiptFilename)
    response = await fetch(`${webhookUrl}?wait=true`, { method: 'POST', body: discordBody })
  } else {
    response = await fetch(`${webhookUrl}?wait=true`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Discord webhook failed (${response.status}): ${errorText}`
    )
  }

  const discordMessage = await response.json().catch(() => null)

  if (
    !discordMessage ||
    typeof discordMessage !== 'object' ||
    !('id' in discordMessage) ||
    typeof discordMessage.id !== 'string'
  ) {
    throw new Error('Discord webhook did not return a message ID.')
  }

  return discordMessage.id
}

interface GiftPackageDefinition {
  title: string
  amount: number
}

/*
 * Keep this catalog synchronized with src/giftPackageData.ts.
 * The server uses it to prevent clients from changing package prices/titles.
 */
const V1_GIFT_PACKAGES: Record<string, GiftPackageDefinition> = {
  'currency-5': { title: 'Diamond Package', amount: 5 },
  'currency-10': { title: 'Diamond Package', amount: 10 },
  'currency-50': { title: 'Diamond Package', amount: 50 },
  'currency-100': { title: 'Diamond Package', amount: 100 },
  'currency-200': { title: 'Diamond Package', amount: 200 },
  'currency-500': { title: 'Diamond Package', amount: 500 },
  'currency-1000': { title: 'Diamond Package', amount: 1000 },
  'support-skill-bundle': { title: 'SKILL BUNDLE', amount: 15 },
  'support-guild-bundle': { title: 'GUILD BUNDLE', amount: 20 },
  'support-job-advance': { title: 'JOB ADVANCE PACKAGE', amount: 25 },
  'support-awakening': { title: 'AWAKENING PACKAGE', amount: 25 },
  'support-alchemy-pack': { title: 'ALCHEMY PACK', amount: 20 },
  'support-nc-gears-starter': { title: 'NC GEARS STARTER', amount: 100 },
  'support-4th-job-advance': { title: '4TH JOB ADVANCE PACK', amount: 200 },
  'august-supply-50': { title: 'AUGUST SUPPLY PACKAGE', amount: 50 },
  'august-supply-100': { title: 'AUGUST SUPPLY PACKAGE', amount: 100 },
  'august-supply-500': { title: 'AUGUST SUPPLY PACKAGE', amount: 500 },
  'august-supply-1000': { title: 'AUGUST SUPPLY PACKAGE', amount: 1000 },
  'september-supply-50': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 50 },
  'september-supply-100': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 100 },
  'september-supply-500': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 500 },
  'september-supply-1000': { title: 'SEPTEMBER SUPPLY PACKAGE', amount: 1000 },
}

// Server catalogs are intentionally separate. V2 begins mirrored from V1, but
// either catalog can now be changed independently without affecting the other.
const V2_GIFT_PACKAGES: Record<string, GiftPackageDefinition> = { ...V1_GIFT_PACKAGES }
const GIFT_PACKAGES_BY_SERVER = { v1: V1_GIFT_PACKAGES, v2: V2_GIFT_PACKAGES } as const
type PlayCrowsServer = keyof typeof GIFT_PACKAGES_BY_SERVER

function parseServer(value: unknown): PlayCrowsServer | null {
  return value === 'v1' || value === 'v2' ? value : null
}

const EARLY_PROMO_CODE = 'WEEKEND10'
const EARLY_PROMO_DISCOUNT_PERCENT = 10
const EARLY_PROMO_END_TIMESTAMP = Date.parse(
  '2026-08-30T15:59:00.000Z'
)


const CURRENCY_RATES_FROM_USD: Record<string, number> = {
  USD: 1,
  PHP: 60,
  GBP: 0.79,
}

function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

function buildPayPalCustomId(server: PlayCrowsServer, playerId: string, username: string) {
  return `PC|${playerId.trim()}|${server.toUpperCase()}|${username.trim()}`.slice(0, 127)
}

function getPayPalBaseUrl() {
  return Deno.env.get('PAYPAL_ENV')?.toLowerCase() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'
}

async function getPayPalAccessToken(server: PlayCrowsServer) {
  const suffix = server.toUpperCase()
  const clientId = Deno.env.get(`PAYPAL_CLIENT_ID_${suffix}`) || Deno.env.get('PAYPAL_CLIENT_ID')
  const clientSecret = Deno.env.get(`PAYPAL_CLIENT_SECRET_${suffix}`) || Deno.env.get('PAYPAL_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('PayPal server credentials are not configured.')
  }

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.access_token) {
    console.error('PayPal OAuth verification error:', payload)
    throw new Error('Unable to verify the PayPal payment.')
  }

  return String(payload.access_token)
}

async function verifyPayPalOrder(options: {
  server: PlayCrowsServer
  orderId: string
  captureId: string
  playerId: string
  username: string
  expectedAmountUsd: number
}) {
  const { server, orderId, captureId, playerId, username, expectedAmountUsd } = options
  const accessToken = await getPayPalAccessToken(server)

  const response = await fetch(
    `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  const order = await response.json().catch(() => null)
  if (!response.ok || !order) {
    console.error('PayPal order verification error:', order)
    throw new Error('Unable to verify the PayPal order.')
  }

  if (order.status !== 'COMPLETED') {
    throw new Error('The PayPal payment is not completed.')
  }

  const purchaseUnit = order.purchase_units?.[0]
  const capture = purchaseUnit?.payments?.captures?.find(
    (item: any) => item?.id === captureId
  )

  if (!capture || capture.status !== 'COMPLETED') {
    throw new Error('The PayPal capture could not be verified.')
  }

  const customId = String(purchaseUnit?.custom_id ?? '')
  // Accept both layouts so checkouts created before this fix can still be submitted:
  // old: PC|V1|PLAYER_ID|CHARACTER
  // new: PC|PLAYER_ID|V1|CHARACTER (compatible with the PayPal Discord monitor)
  const legacyDualServerCustomId = `PC|${server.toUpperCase()}|${playerId.trim()}|${username.trim()}`.slice(0, 127)
  if (customId !== buildPayPalCustomId(server, playerId, username) && customId !== legacyDualServerCustomId) {
    throw new Error('The PayPal payment does not match this PlayCrows account.')
  }

  const paidCurrency = String(capture.amount?.currency_code ?? '')
  const paidAmount = Number(capture.amount?.value)

  if (paidCurrency !== 'USD' || !Number.isFinite(paidAmount)) {
    throw new Error('The PayPal payment currency is invalid.')
  }

  if (Math.abs(paidAmount - expectedAmountUsd) > 0.001) {
    throw new Error('The PayPal payment amount does not match the selected package.')
  }

  return {
    payerEmail:
      typeof order.payer?.email_address === 'string'
        ? order.payer.email_address
        : null,
  }
}

function getText(formData: FormData, field: string): string {
  const value = formData.get(field)
  return typeof value === 'string' ? value.trim() : ''
}

function errorResponse(message: string, status = 400) {
  return Response.json(
    { success: false, error: message },
    { status }
  )
}

export default {
  fetch: withSupabase(
    { auth: 'publishable' },

    async (request, context) => {
      if (request.method !== 'POST') {
        return errorResponse('Method not allowed.', 405)
      }

      const contentType = request.headers.get('content-type') ?? ''

      if (!contentType.toLowerCase().includes('multipart/form-data')) {
        return errorResponse('The request must use multipart/form-data.')
      }

      let formData: FormData

      try {
        formData = await request.formData()
      } catch {
        return errorResponse('Unable to read the submitted form.')
      }

      const website = getText(formData, 'website')
      if (website) return errorResponse('Submission rejected.')

      const server = parseServer(getText(formData, 'server').toLowerCase())
      const playerId = getText(formData, 'playerId')
      const deviceId = getText(formData, 'deviceId').slice(0, 100)
      const forwardedIp = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || '').trim()
      const ipHash = forwardedIp ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(forwardedIp)))).map(b => b.toString(16).padStart(2, '0')).join('') : ''
      const username = getText(formData, 'username')
      const currency = getText(formData, 'currency').toUpperCase()
      const amountText = getText(formData, 'amount')
      const amountMode = getText(formData, 'amountMode').toLowerCase()
      const promoCode = getText(formData, 'promoCode').toUpperCase()
      const selectedPackageId = getText(formData, 'selectedPackageId')
      const submittedPackageTitle = getText(formData, 'selectedPackageTitle')
      const selectedPackageText = getText(formData, 'selectedPackageAmount')
      const packageQuantityText = getText(formData, 'packageQuantity')
      const additionalNotes = getText(formData, 'additionalNotes')
      const paymentMethod = getText(formData, 'paymentMethod').toLowerCase()
      const paypalOrderId = getText(formData, 'paypalOrderId')
      const paypalCaptureId = getText(formData, 'paypalCaptureId')
      const paypalPaymentStatus = getText(formData, 'paypalPaymentStatus').toUpperCase()
      const paddleCheckoutId = getText(formData, 'paddleCheckoutId')
      const paddleTransactionId = getText(formData, 'paddleTransactionId')
      const paddlePaymentStatus = getText(formData, 'paddlePaymentStatus').toUpperCase()
      const receipt = formData.get('receipt')

      if (!server) return errorResponse('Please select a valid PlayCrows server.')
      if (!playerId) return errorResponse('Player ID is required.')
      if (playerId.length > 100) return errorResponse('Player ID is too long.')
      if (!username) return errorResponse('Username is required.')
      if (username.length > 100) return errorResponse('Username is too long.')

      // Submission restrictions are checked before receipt upload or donation creation.
      const identifiers = [
        { type: 'player_id', value: playerId.trim().toLowerCase() },
        ...(ipHash ? [{ type: 'ip_hash', value: ipHash }] : []),
        ...(deviceId ? [{ type: 'device_id', value: deviceId }] : []),
      ]
      for (const identifier of identifiers) {
        const { data: activeBlock, error: blockError } = await context.supabaseAdmin
          .from('submission_blocks')
          .select('id, expires_at')
          .eq('identifier_type', identifier.type)
          .eq('identifier_value', identifier.value)
          .eq('active', true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .limit(1)
          .maybeSingle()
        if (blockError) {
          console.error('Submission block check failed:', blockError)
          return errorResponse('Unable to validate this submission right now. Please try again.', 500)
        }
        if (activeBlock) {
          return errorResponse('You are temporarily restricted from submitting payment receipts. Please contact PlayCrows support if you believe this is an error.', 403)
        }
      }

      if (!ALLOWED_CURRENCIES.has(currency)) {
        return errorResponse('Invalid currency.')
      }

      if (amountMode !== 'package') {
        return errorResponse('Invalid donation amount mode.')
      }

      const selectedPackage = GIFT_PACKAGES_BY_SERVER[server][selectedPackageId]
      if (!selectedPackage) {
        return errorResponse('Invalid gift package.')
      }

      const packageQuantity = Number(packageQuantityText)
      if (
        !Number.isInteger(packageQuantity) ||
        packageQuantity < 1 ||
        packageQuantity > MAX_PACKAGE_QUANTITY
      ) {
        return errorResponse('Invalid package quantity.')
      }

      if (additionalNotes.length > MAX_ADDITIONAL_NOTES_LENGTH) {
        return errorResponse(
          `Additional notes must be ${MAX_ADDITIONAL_NOTES_LENGTH} characters or fewer.`
        )
      }

      const submittedAmount = Number(amountText)
      if (!Number.isFinite(submittedAmount) || submittedAmount <= 0) {
        return errorResponse('Invalid donation amount.')
      }

      const submittedPackageAmount = Number(selectedPackageText)
      if (
        !Number.isFinite(submittedPackageAmount) ||
        Math.abs(submittedPackageAmount - selectedPackage.amount) > 0.001
      ) {
        return errorResponse('The selected gift package price is invalid.')
      }

      if (
        submittedPackageTitle &&
        submittedPackageTitle !== selectedPackage.title
      ) {
        return errorResponse('The selected gift package title is invalid.')
      }

      const expectedAmountUsd = roundMoney(
        selectedPackage.amount * packageQuantity
      )

      if (Math.abs(submittedAmount - expectedAmountUsd) > 0.001) {
        return errorResponse(
          'The submitted amount does not match the selected package and quantity.'
        )
      }

      const currencyRate = CURRENCY_RATES_FROM_USD[currency]
      let finalAmount = roundMoney(expectedAmountUsd * currencyRate)
      let expectedPayPalAmountUsd = expectedAmountUsd
      let appliedPromoCode: string | null = null
      let discountPercent = 0

      if (promoCode) {
        if (paymentMethod === 'paypal') {
          return errorResponse('Coupon codes are not applicable to PayPal payments.')
        }

        if (promoCode !== EARLY_PROMO_CODE) {
          return errorResponse('Invalid redeem code.')
        }

        if (Date.now() >= EARLY_PROMO_END_TIMESTAMP) {
          return errorResponse('The WEEKEND10 promotion has expired.')
        }

        finalAmount = roundMoney(
          expectedAmountUsd *
            currencyRate *
            (1 - EARLY_PROMO_DISCOUNT_PERCENT / 100)
        )
        expectedPayPalAmountUsd = roundMoney(
          expectedAmountUsd *
            (1 - EARLY_PROMO_DISCOUNT_PERCENT / 100)
        )
        appliedPromoCode = EARLY_PROMO_CODE
        discountPercent = EARLY_PROMO_DISCOUNT_PERCENT
      }

      if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
        return errorResponse('Invalid payment method.')
      }

      let paypalPayerEmail: string | null = null
      let paddleVerifiedAt: string | null = null

      if (paymentMethod === 'paddle') {
        if (!paddleCheckoutId || !paddleTransactionId) {
          return errorResponse('Complete the Paddle payment before submitting.')
        }

        const { data: verifiedPaddlePayment, error: verifiedPaddleError } =
          await context.supabaseAdmin
            .from('paddle_transactions')
            .select('transaction_id, paddle_status, custom_data, occurred_at')
            .eq('transaction_id', paddleTransactionId)
            .maybeSingle()

        if (verifiedPaddleError) {
          console.error('Paddle server verification error:', verifiedPaddleError)
          return errorResponse('Unable to verify the Paddle payment.', 500)
        }

        if (!verifiedPaddlePayment || verifiedPaddlePayment.paddle_status !== 'completed') {
          return errorResponse('Paddle is still verifying this payment. Please wait a few seconds and submit again.')
        }

        const paddleCustomData =
          verifiedPaddlePayment.custom_data &&
          typeof verifiedPaddlePayment.custom_data === 'object'
            ? verifiedPaddlePayment.custom_data as Record<string, unknown>
            : {}

        if (
          paddleCustomData.game !== 'playcrows' ||
          (paddleCustomData.server != null && paddleCustomData.server !== server) ||
          paddleCustomData.package_id !== selectedPackageId ||
          paddleCustomData.player_id !== playerId ||
          paddleCustomData.username !== username
        ) {
          console.error('Paddle custom data mismatch:', {
            transactionId: paddleTransactionId,
            paddleCustomData,
            submitted: { playerId, username, selectedPackageId },
          })
          return errorResponse('The Paddle payment details do not match this submission.')
        }

        const { data: existingPaddlePayment, error: existingPaddleError } =
          await context.supabaseAdmin
            .from('donations')
            .select('id')
            .eq('paddle_transaction_id', paddleTransactionId)
            .maybeSingle()

        if (existingPaddleError) {
          console.error('Paddle duplicate check error:', existingPaddleError)
          return errorResponse('Unable to validate the Paddle payment reference.', 500)
        }

        if (existingPaddlePayment) {
          return errorResponse('This Paddle payment has already been used for a submission.')
        }

        paddleVerifiedAt = verifiedPaddlePayment.occurred_at || new Date().toISOString()
      }

      if (paymentMethod === 'paypal') {
        if (!paypalOrderId || !paypalCaptureId || paypalPaymentStatus !== 'COMPLETED') {
          return errorResponse('Complete the PayPal payment before submitting.')
        }

        const { data: existingPayPalPayment, error: existingPayPalError } =
          await context.supabaseAdmin
            .from('donations')
            .select('id')
            .eq('paypal_capture_id', paypalCaptureId)
            .maybeSingle()

        if (existingPayPalError) {
          console.error('PayPal duplicate check error:', existingPayPalError)
          return errorResponse('Unable to validate the PayPal payment.', 500)
        }

        if (existingPayPalPayment) {
          return errorResponse('This PayPal payment has already been used for a submission.')
        }

        try {
          const verification = await verifyPayPalOrder({
            server,
            orderId: paypalOrderId,
            captureId: paypalCaptureId,
            playerId,
            username,
            expectedAmountUsd: expectedPayPalAmountUsd,
          })
          paypalPayerEmail = verification.payerEmail
        } catch (error) {
          console.error('PayPal payment verification failed:', error)
          return errorResponse(
            error instanceof Error ? error.message : 'Unable to verify the PayPal payment.'
          )
        }
      }

      const receiptFile = receipt instanceof File ? receipt : null
      if (paymentMethod !== 'paddle' && paymentMethod !== 'paypal' && !receiptFile) {
        return errorResponse('A payment receipt is required.')
      }

      let extension: string | null = null
      let receiptPath: string | null = null

      if (receiptFile) {
        if (receiptFile.size <= 0) return errorResponse('The uploaded receipt is empty.')
        if (receiptFile.size > MAX_RECEIPT_SIZE) return errorResponse('The receipt must not exceed 5 MB.')
        if (!ALLOWED_RECEIPT_TYPES.has(receiptFile.type)) {
          return errorResponse('Only JPG, PNG, WEBP, and PDF receipts are allowed.')
        }

        extension = FILE_EXTENSIONS[receiptFile.type]
        const today = new Date().toISOString().slice(0, 10)
        receiptPath = `${server}/${today}/${crypto.randomUUID()}.${extension}`

        const { error: uploadError } = await context.supabaseAdmin.storage
          .from('payment-receipts')
          .upload(receiptPath, receiptFile, { contentType: receiptFile.type, cacheControl: '3600', upsert: false })

        if (uploadError) {
          console.error('Receipt upload error:', uploadError)
          return errorResponse('Unable to upload the receipt.', 500)
        }
      }

      const recordedCurrency = paymentMethod === 'paypal' ? 'USD' : currency
      const recordedAmount = paymentMethod === 'paypal' ? expectedPayPalAmountUsd : finalAmount

      const { data: donation, error: insertError } = await context.supabaseAdmin
        .from('donations')
        .insert({
          server,
          player_id: playerId,
          username,
          currency: recordedCurrency,
          amount: recordedAmount,
          selected_package_amount: selectedPackage.amount,
          selected_package_id: selectedPackageId,
          selected_package_title: selectedPackage.title,
          package_quantity: packageQuantity,
          additional_notes: additionalNotes || null,
          payment_method: paymentMethod,
          paddle_checkout_id: paymentMethod === 'paddle' ? paddleCheckoutId : null,
          paddle_transaction_id: paymentMethod === 'paddle' ? paddleTransactionId : null,
          paddle_payment_status: paymentMethod === 'paddle' ? 'COMPLETED' : null,
          paypal_order_id: paymentMethod === 'paypal' ? paypalOrderId : null,
          paypal_capture_id: paymentMethod === 'paypal' ? paypalCaptureId : null,
          paypal_payment_status: paymentMethod === 'paypal' ? 'COMPLETED' : null,
          paypal_payer_email: paymentMethod === 'paypal' ? paypalPayerEmail : null,
          paypal_transaction_id: paymentMethod === 'paypal' ? paypalCaptureId : null,
          payment_verified_at: paymentMethod === 'paypal' ? new Date().toISOString() : paymentMethod === 'paddle' ? paddleVerifiedAt : null,
          receipt_path: receiptPath,
          receipt_original_name: receiptFile
            ? receiptFile.name.replace(/[^\w.\- ]/g, '').slice(0, 255) || `receipt.${extension}`
            : null,
          receipt_mime_type: receiptFile?.type ?? null,
          receipt_size_bytes: receiptFile?.size ?? null,
          promo_code: appliedPromoCode,
          discount_percent: discountPercent,
          status: 'pending',
          submission_ip_hash: ipHash || null,
          submission_device_id: deviceId || null,
        })
        .select(`
          id,
          reference_code,
          created_at,
          status,
          event_bonus_name,
          event_bonus_eligible
        `)
        .single()

      if (insertError) {
        console.error('Donation insert error:', insertError)

        if (receiptPath) {
          await context.supabaseAdmin.storage.from('payment-receipts').remove([receiptPath])
        }

        return errorResponse('Unable to save the donation submission.', 500)
      }


      const discordWebhookUrl =
        Deno.env.get(`DISCORD_DONATION_WEBHOOK_URL_${server.toUpperCase()}`) ||
        Deno.env.get('DISCORD_DONATION_WEBHOOK_URL')

      const adminDashboardUrl =
        Deno.env.get('ADMIN_DASHBOARD_URL') ||
        DEFAULT_ADMIN_DASHBOARD_URL

      if (discordWebhookUrl) {
        try {
          const discordMessageId = await sendDiscordDonationNotification({
            webhookUrl: discordWebhookUrl,
            adminDashboardUrl,
            donation: {
              referenceCode: donation.reference_code,
              createdAt: donation.created_at,
              eventBonusName: donation.event_bonus_name ?? null,
              eventBonusEligible: donation.event_bonus_eligible ?? null,
            },
            server,
            playerId,
            username,
            currency: recordedCurrency,
            finalAmount: recordedAmount,
            selectedPackageId,
            selectedPackageTitle: selectedPackage.title,
            selectedPackageAmount: selectedPackage.amount,
            packageQuantity,
            paymentMethod,
            additionalNotes,
            receipt: receiptFile,
            receiptExtension: extension,
          })

          const { error: discordMessageIdError } = await context.supabaseAdmin
            .from('donations')
            .update({
              discord_message_id: discordMessageId,
            })
            .eq('id', donation.id)

          if (discordMessageIdError) {
            console.error(
              'Unable to save Discord message ID:',
              discordMessageIdError
            )
          }
        } catch (discordError) {
          /*
           * Discord notifications are intentionally non-blocking.
           * The donation has already been safely stored, so a Discord
           * outage must never make the player's submission fail.
           */
          console.error(
            'Discord donation notification error:',
            discordError
          )
        }
      } else {
        console.warn(
          'DISCORD_DONATION_WEBHOOK_URL is not configured; skipping Discord notification.'
        )
      }

      return Response.json(
        {
          success: true,
          message: 'Donation submitted successfully.',
          donation: {
            id: donation.id,
            referenceCode: donation.reference_code,
            createdAt: donation.created_at,
            status: donation.status,
          },
        },
        { status: 201 }
      )
    }
  ),
}