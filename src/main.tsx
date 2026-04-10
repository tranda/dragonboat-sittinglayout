import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './components/App'
import data from './data/data.json'
import type { AppData } from './types'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App data={data as AppData} />
  </StrictMode>,
)
