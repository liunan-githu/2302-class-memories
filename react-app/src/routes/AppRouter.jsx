import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PublicLayout } from '../components/layout/PublicLayout'
import { AdminLayout } from '../components/layout/AdminLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { GuestRoute } from './GuestRoute'
import { lazy, Suspense } from 'react'

const HomePage = lazy(() => import('../pages/HomePage'))
const AuthPage = lazy(() => import('../pages/AuthPage'))
const UploadCenterPage = lazy(() => import('../pages/UploadCenterPage'))
const VideoUploadPage = lazy(() => import('../pages/VideoUploadPage'))
const PhotoUploadPage = lazy(() => import('../pages/PhotoUploadPage'))
const UploadStatusPage = lazy(() => import('../pages/UploadStatusPage'))
const VideoDetailPage = lazy(() => import('../pages/VideoDetailPage'))
const ClassmatesPage = lazy(() => import('../pages/ClassmatesPage'))
const AboutPage = lazy(() => import('../pages/AboutPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'))
const VideoManageTab = lazy(() => import('../components/admin/VideoManageTab'))
const PhotoManageTab = lazy(() => import('../components/admin/PhotoManageTab'))
const UserManageTab = lazy(() => import('../components/admin/UserManageTab'))
const ClassmateManageTab = lazy(() => import('../components/admin/ClassmateManageTab'))
const AboutEditorTab = lazy(() => import('../components/admin/AboutEditorTab'))
const CommentManageTab = lazy(() => import('../components/admin/CommentManageTab'))
const StatisticsTab = lazy(() => import('../components/admin/StatisticsTab'))
const PermissionManageTab = lazy(() => import('../components/admin/PermissionManageTab'))
const AuditLogTab = lazy(() => import('../components/admin/AuditLogTab'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )
}

function Lazy({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <Lazy><HomePage /></Lazy> },
      { path: 'login', element: <GuestRoute><Lazy><AuthPage tab="login" /></Lazy></GuestRoute> },
      { path: 'register', element: <GuestRoute><Lazy><AuthPage tab="register" /></Lazy></GuestRoute> },
      { path: 'upload', element: <ProtectedRoute><Lazy><UploadCenterPage /></Lazy></ProtectedRoute> },
      { path: 'upload/video', element: <ProtectedRoute><Lazy><VideoUploadPage /></Lazy></ProtectedRoute> },
      { path: 'upload/photos', element: <ProtectedRoute><Lazy><PhotoUploadPage /></Lazy></ProtectedRoute> },
      { path: 'upload/status', element: <ProtectedRoute><Lazy><UploadStatusPage /></Lazy></ProtectedRoute> },
      { path: 'video/:id', element: <Lazy><VideoDetailPage /></Lazy> },
      { path: 'classmates', element: <Lazy><ClassmatesPage /></Lazy> },
      { path: 'about', element: <Lazy><AboutPage /></Lazy> },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Lazy><AdminDashboard /></Lazy> },
      { path: 'videos', element: <Lazy><VideoManageTab /></Lazy> },
      { path: 'photos', element: <Lazy><PhotoManageTab /></Lazy> },
      { path: 'users', element: <Lazy><UserManageTab /></Lazy> },
      { path: 'classmates', element: <Lazy><ClassmateManageTab /></Lazy> },
      { path: 'about', element: <Lazy><AboutEditorTab /></Lazy> },
      { path: 'comments', element: <Lazy><CommentManageTab /></Lazy> },
      { path: 'statistics', element: <Lazy><StatisticsTab /></Lazy> },
      { path: 'permissions', element: <Lazy><PermissionManageTab /></Lazy> },
      { path: 'audit', element: <Lazy><AuditLogTab /></Lazy> },
    ],
  },
  {
    path: '*',
    element: <PublicLayout><Lazy><NotFoundPage /></Lazy></PublicLayout>,
  },
])
