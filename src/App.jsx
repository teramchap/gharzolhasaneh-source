import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import MemberDashboard from './pages/member/MemberDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import FundsPage from './pages/admin/FundsPage'
import FundDetailPage from './pages/admin/FundDetailPage'
import UsersPage from './pages/admin/UsersPage'
import DrawPage from './pages/admin/DrawPage'
import AdminReceiptsPage from './pages/admin/ReceiptsPage'
import MemberReceiptsPage from './pages/member/MemberReceiptsPage'
import WinnersPage from './pages/admin/WinnersPage'
import WinnerDetailPage from './pages/WinnerDetailPage'
import ReportsPage from './pages/admin/ReportsPage'
import AnnouncementPage from './pages/admin/AnnouncementPage'
import MemberChatPage from './pages/member/MemberChatPage'
import AdminChatListPage from './pages/admin/AdminChatListPage'
import AdminChatPage from './pages/admin/AdminChatPage'
import MemberSharesPage from './pages/member/MemberSharesPage'
import ChangePasswordPage from './pages/member/ChangePasswordPage'
import MemberPaymentHistoryPage from './pages/member/MemberPaymentHistoryPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute role="member">
                <MemberDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/funds"
            element={
              <ProtectedRoute role="admin">
                <FundsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/funds/:id"
            element={
              <ProtectedRoute role="admin">
                <FundDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="admin">
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/draw"
            element={
              <ProtectedRoute role="admin">
                <DrawPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/receipts"
            element={
              <ProtectedRoute role="admin">
                <AdminReceiptsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/receipts"
            element={
              <ProtectedRoute role="member">
                <MemberReceiptsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/winners"
            element={
              <ProtectedRoute role="admin">
                <WinnersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/winners/:id"
            element={
              <ProtectedRoute role="admin">
                <WinnerDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/winner/:id"
            element={
              <ProtectedRoute role="member">
                <WinnerDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute role="admin">
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/announcement"
            element={
              <ProtectedRoute role="admin">
                <AnnouncementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/chat"
            element={
              <ProtectedRoute role="member">
                <MemberChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/chat"
            element={
              <ProtectedRoute role="admin">
                <AdminChatListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/chat/:id"
            element={
              <ProtectedRoute role="admin">
                <AdminChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/shares"
            element={
              <ProtectedRoute role="member">
                <MemberSharesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/change-password"
            element={
              <ProtectedRoute role="member">
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/payment-history"
            element={
              <ProtectedRoute role="member">
                <MemberPaymentHistoryPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
