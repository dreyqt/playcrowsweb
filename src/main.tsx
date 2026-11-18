import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AdminApp } from './admin/AdminApp'
import { EventCenter } from './events/EventCenter'
import { EventAdmin } from './events/EventAdmin'
import { V2BetaAdmin } from './beta/V2BetaAdmin'
import ResearchPage from './research/ResearchPage'
import ResearchAdmin from './research/ResearchAdmin'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const RootComponent =
  path === '/research'
    ? ResearchPage
    : path === '/admin/research'
    ? ResearchAdmin
    : path === '/admin/v2-beta-claims' || path.startsWith('/admin/v2-beta-claims/')
    ? V2BetaAdmin
    : path === '/v2-beta-claim' || path.startsWith('/v2-beta-claim/')
    ? EventCenter
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
