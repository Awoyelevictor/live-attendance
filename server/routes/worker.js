import express from 'express';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/auth.js';
import { dbStore, getStreakTier } from '../services/store.js';

const router = express.Router();
const getJwtSecret = () => process.env.JWT_SECRET || 'attendance_dev_jwt_secret_2026';

router.use(protect);

// @desc    Worker Check-In with Streak & Early Bird Point Persistence
// @route   POST /api/worker/check-in
router.post('/check-in', async (req, res) => {
  const { lat, lng, os, browser } = req.body;
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const today = now.toISOString().split('T')[0];

  try {
    // 1. Check if it's weekend
    if (day === 0 || day === 6) {
      return res.status(403).json({ message: 'Attendance is only allowed from Monday to Friday' });
    }

    // 2. Check if system is active (not holiday/shut off)
    const isSystemActive = await dbStore.getSystemSetting('isSystemActive', true);
    if (!isSystemActive) {
      return res.status(403).json({ message: 'The attendance system is currently disabled for holiday' });
    }

    const alreadyCheckedIn = await dbStore.findAttendanceToday(req.user._id, today);
    if (alreadyCheckedIn) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    // Find nearest location
    const locations = await dbStore.getLocations({ status: 'Active' });
    let nearest = null;
    let minDistance = Infinity;

    const deg2rad = (deg) => deg * (Math.PI / 180);
    const getDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // metres
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    locations.forEach(loc => {
      const dist = getDistance(lat, lng, loc.lat, loc.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = loc;
      }
    });

    if (!nearest || minDistance > (nearest.radius || 500)) {
      return res.status(400).json({ message: 'You are too far from any office location' });
    }

    const checkInTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    
    // Check if late based on location's clockInTime
    let status = 'present';
    let minutesEarly = 0;
    let isEarlyBird = false;
    const locationClockIn = nearest.clockInTime || '09:00';
    
    if (locationClockIn) {
      const [workH, workM] = locationClockIn.split(':').map(Number);
      const [nowH, nowM] = checkInTime.split(':').map(Number);
      
      const workMin = workH * 60 + workM;
      const graceMin = workMin + (nearest.gracePeriod || 0);
      const nowMin = nowH * 60 + nowM;
      
      minutesEarly = workMin - nowMin;
      if (minutesEarly >= 5) {
        isEarlyBird = true;
      }

      if (nowMin > graceMin) {
        status = 'late';
      }
    }

    // Fetch user for persistent streak calculations
    const currentUser = await dbStore.findUserById(req.user._id);
    let newStreak = 0;
    let newBestStreak = currentUser?.bestStreak || 0;
    let pointsEarned = 0;
    let totalPoints = currentUser?.earlyBirdPoints || 0;
    let tierInfo = getStreakTier(0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    while (yesterday.getDay() === 0 || yesterday.getDay() === 6) {
      yesterday.setDate(yesterday.getDate() - 1);
    }
    const previousWorkdayStr = yesterday.toISOString().split('T')[0];

    if (status === 'present') {
      const lastPunctual = currentUser?.lastPunctualDate;
      const currentStreakVal = Number(currentUser?.punctualityStreak) || 0;

      if (lastPunctual === previousWorkdayStr) {
        newStreak = currentStreakVal + 1;
      } else if (lastPunctual === today) {
        newStreak = Math.max(1, currentStreakVal);
      } else {
        newStreak = 1;
      }

      newBestStreak = Math.max(newStreak, Number(currentUser?.bestStreak) || 0);
      tierInfo = getStreakTier(newStreak);

      // Base Early Bird & Punctuality XP points
      let basePoints = 50; // On-time
      if (minutesEarly >= 15) {
        basePoints = 100; // Super Early Bird
      } else if (minutesEarly >= 5) {
        basePoints = 75; // Early Bird
      }

      pointsEarned = Math.round(basePoints * (tierInfo.multiplier || 1.0));
      totalPoints = (Number(currentUser?.earlyBirdPoints) || 0) + pointsEarned;

      // Persist to Database
      await dbStore.updateUser(req.user._id, {
        punctualityStreak: newStreak,
        bestStreak: newBestStreak,
        earlyBirdPoints: totalPoints,
        lastPunctualDate: today,
        streakRank: tierInfo.rank,
        earlyBirdMultiplier: tierInfo.multiplier,
        totalEarlyCheckIns: isEarlyBird ? ((Number(currentUser?.totalEarlyCheckIns) || 0) + 1) : (Number(currentUser?.totalEarlyCheckIns) || 0),
        totalOnTimeCheckIns: (Number(currentUser?.totalOnTimeCheckIns) || 0) + 1
      });
    } else {
      // If late, the streak breaks and resets to 0 in database
      newStreak = 0;
      tierInfo = getStreakTier(0);
      await dbStore.updateUser(req.user._id, {
        punctualityStreak: 0,
        streakRank: 'Unranked',
        earlyBirdMultiplier: 1.0
      });
    }

    const attendance = await dbStore.createAttendance({
      user: req.user._id,
      date: today,
      checkInTime,
      location: nearest.name,
      coordinates: { lat, lng },
      distance: Math.round(minDistance),
      status,
      os,
      browser
    });

    res.status(201).json({
      ...attendance,
      streakCount: newStreak,
      bestStreak: newBestStreak,
      pointsEarned,
      totalPoints,
      minutesEarly: Math.max(0, minutesEarly),
      isEarlyBird,
      streakTier: tierInfo,
      streakIncreased: status === 'present'
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: error.message || 'Check-in failed' });
  }
});

// @desc    Worker Check-Out
// @route   POST /api/worker/check-out
router.post('/check-out', async (req, res) => {
  const { lat, lng } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    const attendanceRecord = await dbStore.findAttendanceToday(req.user._id, today);
    if (!attendanceRecord) {
      return res.status(400).json({ message: 'No check-in record found for today' });
    }

    if (attendanceRecord.checkOutTime) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    const checkOutTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const updateData = { checkOutTime };
    if (lat && lng) {
      updateData.outCoordinates = { lat, lng };
    }

    const updated = await dbStore.updateAttendance(attendanceRecord._id, updateData);
    res.json(updated);
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ message: error.message || 'Check-out failed' });
  }
});

// @desc    Get worker attendance history
// @route   GET /api/worker/history
router.get('/history', async (req, res) => {
  try {
    const allAttendance = await dbStore.getWorkerAttendance(req.user._id);
    res.json(allAttendance);
  } catch (error) {
    console.error('Worker history error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch attendance history' });
  }
});

// @desc    Get Early Bird & Fire Streak Leaderboard
// @route   GET /api/worker/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboardData = await dbStore.getLeaderboard(req.user._id);
    res.json(leaderboardData);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch leaderboard' });
  }
});

// @desc    Get worker stats & recent attendance
// @route   GET /api/worker/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const month = new Date().toISOString().substring(0, 7); // YYYY-MM
    const allWorkerAttendance = await dbStore.getWorkerAttendance(req.user._id);
    const currentUser = await dbStore.findUserById(req.user._id);

    const daysPresent = allWorkerAttendance.filter(a => a.date.startsWith(month) && a.status === 'present').length;
    const lateDays = allWorkerAttendance.filter(a => a.date.startsWith(month) && a.status === 'late').length;
    
    const recent = allWorkerAttendance.slice(0, 10);
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = allWorkerAttendance.find(a => a.date === today);
    const checkedInToday = !!todayRecord;
    const checkedOutToday = !!todayRecord?.checkOutTime;

    // Retrieve database-persisted streak & calculate tier
    const persistedStreak = Number(currentUser?.punctualityStreak) || 0;
    const bestStreak = Math.max(persistedStreak, Number(currentUser?.bestStreak) || 0);
    const earlyBirdPoints = Number(currentUser?.earlyBirdPoints) || 0;
    const streakTier = getStreakTier(persistedStreak);

    const locations = await dbStore.getLocations();
    const activeLocations = locations.filter(l => l.status === 'Active');
    const activeLocation = activeLocations[0] || locations[0] || {};
    const gracePeriod = activeLocation.gracePeriod || 15;
    const workStartTime = activeLocation.clockInTime || '09:00';
    const workEndTime = activeLocation.clockOutTime || '17:00';

    // Get leaderboard summary
    const leaderboardData = await dbStore.getLeaderboard(req.user._id);

    const isSystemActive = await dbStore.getSystemSetting('isSystemActive', true);
    const now = new Date();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;

    res.json({
      daysPresent,
      lateDays,
      workStartTime,
      workEndTime,
      gracePeriod,
      locationName: activeLocation.name || 'Main Office',
      recent,
      checkedInToday,
      checkedOutToday,
      currentStreak: persistedStreak,
      bestStreak,
      earlyBirdPoints,
      totalEarlyCheckIns: currentUser?.totalEarlyCheckIns || 0,
      totalOnTimeCheckIns: currentUser?.totalOnTimeCheckIns || daysPresent,
      streakTier,
      todayRecord,
      myLeaderboardRank: leaderboardData.myStats?.rank || 1,
      totalCompetitors: leaderboardData.myStats?.totalCompetitors || 1,
      streaksOnFireCount: leaderboardData.streaksOnFireCount || 0,
      leaderboardTop: leaderboardData.leaderboard.slice(0, 5),
      isSystemActive,
      isWeekend,
      activeLocations: activeLocations.map(l => ({
        name: l.name,
        lat: l.lat,
        lng: l.lng,
        radius: l.radius || 500
      }))
    });
  } catch (error) {
    console.error('Worker dashboard error:', error);
    res.status(500).json({ message: error.message || 'Failed to load worker dashboard' });
  }
});

// @desc    Update profile
router.put('/profile', async (req, res) => {
  try {
    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.phone) updateData.phone = req.body.phone;
    if (req.body.avatar) updateData.avatar = req.body.avatar;
    if (req.body.password) updateData.password = req.body.password;

    const updatedUser = await dbStore.updateUser(req.user._id, updateData);
    if (updatedUser) {
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        department: updatedUser.department,
        employeeId: updatedUser.employeeId,
        workStartTime: updatedUser.workStartTime,
        punctualityStreak: updatedUser.punctualityStreak,
        bestStreak: updatedUser.bestStreak,
        earlyBirdPoints: updatedUser.earlyBirdPoints,
        streakRank: updatedUser.streakRank,
        token: jwt.sign({ id: updatedUser._id }, getJwtSecret(), { expiresIn: '30d' })
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
});

export default router;
