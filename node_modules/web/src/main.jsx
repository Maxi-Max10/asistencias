import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import './index.css'
import Home from './pages/Home.jsx'
import AttendancePage from './pages/AttendancePage.jsx'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/finca/:id', element: <AttendancePage /> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
