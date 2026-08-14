import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AdminApp } from './admin/AdminApp'
import { EventCenter } from './events/EventCenter'
import { EventAdmin } from './events/EventAdmin'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const RootComponent =
  path === '/admin/events' || path.startsWith('/admin/events/')
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
