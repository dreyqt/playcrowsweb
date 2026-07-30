import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AdminApp } from './admin/AdminApp'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const RootComponent =
  path === '/admin' || path.startsWith('/admin/')
    ? AdminApp
    : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>
)
