import express from 'express';
import { protect, admin, adminOrSupervisor } from '../middleware/auth.js';
import { dbStore } from '../services/store.js';

const router = express.Router();

router.use(protect);

// @desc    Get dashboard stats (Admin & Supervisor)
// @route   GET /api/admin/dashboard
router.get('/dashboard', adminOrSupervisor, async (req, res) => {
  try {
    const stats = await dbStore.getAdminDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch dashboard stats' });
  }
});

// @desc    Get all users (Admin & Supervisor)
// @route   GET /api/admin/users
router.get('/users', adminOrSupervisor, async (req, res) => {
  try {
    const role = req.query.role || 'all';
    const users = await dbStore.getUsers(role);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a new user (Admin only)
// @route   POST /api/admin/users
router.post('/users', admin, async (req, res) => {
  try {
    const { name, email, password, role, employeeId, department, phone, workStartTime, workEndTime } = req.body;
    const userExists = await dbStore.findUserByEmail(email);
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = await dbStore.createUser({
      name, email, password, role: role || 'trainee', employeeId, department, phone, workStartTime, workEndTime
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get a single user (Admin & Supervisor)
// @route   GET /api/admin/users/:id
router.get('/users/:id', adminOrSupervisor, async (req, res) => {
  try {
    const user = await dbStore.findUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a user (Admin only)
// @route   PUT /api/admin/users/:id
router.put('/users/:id', admin, async (req, res) => {
  try {
    const updatedUser = await dbStore.updateUser(req.params.id, req.body);
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a user (Admin only)
// @route   DELETE /api/admin/users/:id
router.delete('/users/:id', admin, async (req, res) => {
  try {
    const success = await dbStore.deleteUser(req.params.id);
    if (!success) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get attendance records (Admin & Supervisor)
// @route   GET /api/admin/attendance
router.get('/attendance', adminOrSupervisor, async (req, res) => {
  try {
    const attendance = await dbStore.getAttendanceList();
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update attendance record (Admin only)
// @route   PUT /api/admin/attendance/:id
router.put('/attendance/:id', admin, async (req, res) => {
  try {
    const updatedAttendance = await dbStore.updateAttendance(req.params.id, req.body);
    if (!updatedAttendance) return res.status(404).json({ message: 'Record not found' });
    res.json(updatedAttendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete attendance record (Admin only)
// @route   DELETE /api/admin/attendance/:id
router.delete('/attendance/:id', admin, async (req, res) => {
  try {
    const success = await dbStore.deleteAttendance(req.params.id);
    if (!success) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get locations (Admin & Supervisor)
// @route   GET /api/admin/locations
router.get('/locations', adminOrSupervisor, async (req, res) => {
  try {
    const locations = await dbStore.getLocations();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create location (Admin only)
router.post('/locations', admin, async (req, res) => {
  try {
    const location = await dbStore.createLocation(req.body);
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update location (Admin only)
router.put('/locations/:id', admin, async (req, res) => {
  try {
    const location = await dbStore.updateLocation(req.params.id, req.body);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete location (Admin only)
router.delete('/locations/:id', admin, async (req, res) => {
  try {
    const success = await dbStore.deleteLocation(req.params.id);
    if (!success) return res.status(404).json({ message: 'Location not found' });
    res.json({ message: 'Location removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get trainee punctuality & streak leaderboard (Admin & Supervisor)
// @route   GET /api/admin/leaderboard
router.get('/leaderboard', adminOrSupervisor, async (req, res) => {
  try {
    const leaderboardData = await dbStore.getLeaderboard(req.user._id);
    res.json(leaderboardData);
  } catch (error) {
    console.error('Admin leaderboard error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch leaderboard' });
  }
});

// @desc    Get system settings (Admin only)
// @route   GET /api/admin/settings
router.get('/settings', admin, async (req, res) => {
  try {
    const isSystemActive = await dbStore.getSystemSetting('isSystemActive', true);
    res.json({ isSystemActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update system settings (Admin only)
// @route   POST /api/admin/settings
router.post('/settings', admin, async (req, res) => {
  try {
    const { isSystemActive } = req.body;
    if (typeof isSystemActive !== 'boolean') {
      return res.status(400).json({ message: 'isSystemActive must be a boolean' });
    }
    await dbStore.setSystemSetting('isSystemActive', isSystemActive);
    res.json({ message: 'System settings updated', isSystemActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
