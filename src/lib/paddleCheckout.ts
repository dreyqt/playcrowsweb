type PaddleCheckoutCompleted = {
  checkoutId: string
  transactionId: string
  paymentMethod: string
}

type OpenPaddleCheckoutOptions = {
  priceId: string
  quantity: number
  playerId: string
  username: string
  packageId: string
  onCompleted: (result: PaddleCheckoutCompleted) => void
}

declare global {
  interface Window {
    Paddle?: any
  }
}

let paddlePromise: Promise<any> | null = null
let activeCompletionHandler: ((result: PaddleCheckoutCompleted) => void) | null = null

function getClientToken() {
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined
  if (!token) {
    throw new Error('VITE_PADDLE_CLIENT_TOKEN is missing. Add your Paddle client-side token in Vercel and redeploy.')
  }
  return token
}

function getEnvironment() {
  const configured = String(import.meta.env.VITE_PADDLE_ENV ?? 'sandbox').toLowerCase()
  return configured === 'live' ? 'live' : 'sandbox'
}

function loadScript() {
  if (window.Paddle) return Promise.resolve(window.Paddle)

  return new Promise<any>((resolve, reject) => {
    const existing = document.getElementById('paddle-js-v2') as HTMLScriptElement | null
    const finish = () => window.Paddle ? resolve(window.Paddle) : reject(new Error('Paddle.js loaded but Paddle was unavailable.'))

    if (existing) {
      existing.addEventListener('load', finish, { once: true })
      existing.addEventListener('error', () => reject(new Error('Unable to load Paddle checkout.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = 'paddle-js-v2'
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.async = true
    script.onload = finish
    script.onerror = () => reject(new Error('Unable to load Paddle checkout.'))
    document.head.appendChild(script)
  })
}

export async function getPaddle() {
  if (paddlePromise) return paddlePromise

  paddlePromise = (async () => {
    const Paddle = await loadScript()
    const environment = getEnvironment()

    if (environment === 'sandbox') {
      Paddle.Environment.set('sandbox')
    }

    Paddle.Initialize({
      token: getClientToken(),
      eventCallback: (event: any) => {
        if (event?.name !== 'checkout.completed') return

        const transactionId = event?.data?.transaction_id
        const checkoutId = event?.data?.id
        if (!transactionId || !checkoutId || !activeCompletionHandler) return

        const handler = activeCompletionHandler
        activeCompletionHandler = null
        handler({
          transactionId,
          checkoutId,
          paymentMethod: event?.data?.payment?.method_details?.type ?? 'unknown',
        })
      },
    })

    return Paddle
  })().catch(error => {
    paddlePromise = null
    throw error
  })

  return paddlePromise
}

export async function openPaddleCheckout(options: OpenPaddleCheckoutOptions) {
  const Paddle = await getPaddle()
  activeCompletionHandler = options.onCompleted

  Paddle.Checkout.open({
    items: [
      {
        priceId: options.priceId,
        quantity: options.quantity,
      },
    ],
    customData: {
      game: 'playcrows',
      package_id: options.packageId,
      player_id: options.playerId,
      username: options.username,
      fulfillment: 'manual',
    },
    settings: {
      displayMode: 'overlay',
      theme: 'dark',
      variant: 'one-page',
    },
  })
}
