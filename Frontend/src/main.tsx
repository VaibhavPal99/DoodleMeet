import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RecoilRoot } from 'recoil'
import { SocketProvider } from './context/SocketProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RecoilRoot>
    <SocketProvider>
      <App />
    </SocketProvider>
    </RecoilRoot>
  </StrictMode>,
)
