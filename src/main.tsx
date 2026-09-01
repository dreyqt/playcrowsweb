import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AdminApp } from './admin/AdminApp'
import { EventCenter } from './events/EventCenter'
import { EventAdmin } from './events/EventAdmin'
import { V2BetaClaim } from './beta/V2BetaClaim'
import { V2BetaAdmin } from './beta/V2BetaAdmin'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const RootComponent =
  path === '/admin/v2-beta-claims' || path.startsWith('/admin/v2-beta-claims/')
    ? V2BetaAdmin
    : path === '/v2-beta-claim' || path.startsWith('/v2-beta-claim/')
    ? V2BetaClaim
    : path === '/admin/events' || path.startsWith('/admin/events/')
    ? EventAdmin
    : path === '/admin' || path.startsWith('/admin/')
      ? AdminApp
      : path === '/events' || path.startsWith('/events/')
        ? EventCenter
        : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>
)
