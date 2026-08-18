import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminUserCreate from './pages/admin/UserCreate';
import AdminUserDetail from './pages/admin/UserDetail';
import AdminUserEdit from './pages/admin/UserEdit';
import AdminAttendance from './pages/admin/Attendance';
import AdminAttendanceEdit from './pages/admin/AttendanceEdit';
import AdminLocations from './pages/admin/Locations';
import AdminReports from './pages/admin/Reports';
import WorkerDashboard from './pages/worker/Dashboard';
import WorkerHistory from './pages/worker/History';
import WorkerReports from './pages/worker/Reports';
import WorkerProfile from './pages/worker/Profile';
import Messages from './pages/Messages';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const isRoleAllowed = !allowedRoles || 
    allowedRoles.includes(user.role) ||
    ((user.role === 'trainee' || user.role === 'worker') && (allowedRoles.includes('trainee') || allowedRoles.includes('worker')));

  if (!isRoleAllowed) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/worker/dashboard'} replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Shared Authenticated Routes */}
      <Route path="/messages" element={
        <ProtectedRoute allowedRoles={['admin', 'supervisor', 'trainee', 'worker']}>
          <Layout>
            <Messages />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/message" element={<Navigate to="/messages" replace />} />
      <Route path="/message/*" element={<Navigate to="/messages" replace />} />
      <Route path="/messages/*" element={<Navigate to="/messages" replace />} />
      
      {/* Admin & Supervisor Routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
          <Layout>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/create" element={<AdminUserCreate />} />
              <Route path="users/:id" element={<AdminUserDetail />} />
              <Route path="users/:id/edit" element={<AdminUserEdit />} />
              <Route path="attendance" element={<AdminAttendance />} />
              <Route path="attendance/:id/edit" element={<AdminAttendanceEdit />} />
              <Route path="locations" element={<AdminLocations />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="*" element={<Navigate to="dashboard" />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      {/* Trainee / Worker & Supervisor Routes */}
      <Route path="/worker/*" element={
        <ProtectedRoute allowedRoles={['trainee', 'worker', 'supervisor', 'admin']}>
          <Layout>
            <Routes>
              <Route path="dashboard" element={<WorkerDashboard />} />
              <Route path="history" element={<WorkerHistory />} />
              <Route path="reports" element={<WorkerReports />} />
              <Route path="profile" element={<WorkerProfile />} />
              <Route path="*" element={<Navigate to="dashboard" />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
