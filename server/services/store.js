import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Location from '../models/Location.js';
import Message from '../models/Message.js';
import SystemSettings from '../models/SystemSettings.js';
import { isDbConnected } from '../db.js';

// Streak Tier Helper for Gamified Punctuality Competition
export const getStreakTier = (streak = 0) => {
  if (streak >= 30) {
    return {
      rank: 'Phoenix',
      title: 'Phoenix Champion',
      flames: 5,
      multiplier: 3.0,
      badgeColor: 'from-amber-400 via-rose-500 to-purple-600',
      textColor: 'text-amber-300',
      borderColor: 'border-amber-400/50',
      bgColor: 'bg-amber-500/10',
      nextTierStreak: null,
      daysToNext: 0
    };
  }
  if (streak >= 14) {
    return {
      rank: 'Inferno',
      title: 'Inferno Master',
      flames: 4,
      multiplier: 2.0,
      badgeColor: 'from-rose-600 via-orange-500 to-amber-400',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/50',
      bgColor: 'bg-rose-500/10',
      nextTierStreak: 30,
      daysToNext: 30 - streak
    };
  }
  if (streak >= 7) {
    return {
      rank: 'Blaze',
      title: 'Blaze Veteran',
      flames: 3,
      multiplier: 1.5,
      badgeColor: 'from-orange-500 to-amber-500',
      textColor: 'text-orange-400',
      borderColor: 'border-orange-500/50',
      bgColor: 'bg-orange-500/10',
      nextTierStreak: 14,
      daysToNext: 14 - streak
    };
  }
  if (streak >= 3) {
    return {
      rank: 'Flame',
      title: 'Flame Rising',
      flames: 2,
      multiplier: 1.25,
      badgeColor: 'from-amber-500 to-yellow-500',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/50',
      bgColor: 'bg-amber-500/10',
      nextTierStreak: 7,
      daysToNext: 7 - streak
    };
  }
  if (streak >= 1) {
    return {
      rank: 'Spark',
      title: 'Spark Starter',
      flames: 1,
      multiplier: 1.0,
      badgeColor: 'from-yellow-400 to-amber-500',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-400/50',
      bgColor: 'bg-yellow-500/10',
      nextTierStreak: 3,
      daysToNext: 3 - streak
    };
  }
  return {
    rank: 'Unranked',
    title: 'Warm Up',
    flames: 0,
    multiplier: 1.0,
    badgeColor: 'from-slate-600 to-slate-700',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-700',
    bgColor: 'bg-slate-800/30',
    nextTierStreak: 1,
    daysToNext: 1
  };
};

// In-memory store initialized with admin account
const inMemoryUsers = [
  {
    _id: 'mem_admin_1',
    name: 'Admin User',
    email: 'admin@example.com',
    password: '$2a$10$eE2w6uA12pP7vA49xKjUeezQe2Xk3kL9y2y.5y9y9y9y9y9y9y9y9', // hashed 'admin123'
    rawPassword: 'admin123',
    role: 'admin',
    employeeId: 'EMP-001',
    department: 'Management',
    phone: '+1 555-0199',
    workStartTime: '09:00',
    status: 'Active',
    punctualityStreak: 0,
    bestStreak: 0,
    earlyBirdPoints: 0,
    streakRank: 'Unranked',
    earlyBirdMultiplier: 1.0,
    totalEarlyCheckIns: 0,
    totalOnTimeCheckIns: 0,
    createdAt: new Date().toISOString()
  }
];

const inMemoryLocations = [
  {
    _id: 'mem_loc_1',
    name: 'HQ Tech Park',
    address: '100 Innovation Way, Silicon Valley',
    lat: 37.7749,
    lng: -122.4194,
    radius: 5000000, // Very generous radius (5000km) in fallback mode
    clockInTime: '09:00',
    gracePeriod: 30,
    clockOutTime: '17:00',
    status: 'Active',
    createdAt: new Date().toISOString()
  }
];

const inMemoryAttendance = [];
const inMemoryMessages = [];
const inMemorySettings = [
  { key: 'isSystemActive', value: true }
];

export const dbStore = {
  // --- USER METHODS ---
  async findUserByEmail(email) {
    if (isDbConnected()) {
      return await User.findOne({ email: email.toLowerCase() });
    }
    return inMemoryUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id) {
    if (isDbConnected() && /^[0-9a-fA-F]{24}$/.test(id)) {
      const dbUser = await User.findById(id).select('-password');
      if (dbUser) return dbUser;
    }
    const user = inMemoryUsers.find(u => u._id === id);
    if (!user) return null;
    const { password, ...withoutPassword } = user;
    return withoutPassword;
  },

  async savePushSubscription(id, subscription) {
    if (isDbConnected() && /^[0-9a-fA-F]{24}$/.test(id)) {
      await User.findByIdAndUpdate(
        id, 
        { $addToSet: { pushSubscriptions: subscription } }
      );
      return;
    }
    const user = inMemoryUsers.find(u => u._id === id);
    if (user) {
      if (!user.pushSubscriptions) user.pushSubscriptions = [];
      // Prevent duplicates by endpoint
      if (!user.pushSubscriptions.find(s => s.endpoint === subscription.endpoint)) {
        user.pushSubscriptions.push(subscription);
      }
    }
  },

  async getPushSubscriptions(id) {
    if (isDbConnected() && /^[0-9a-fA-F]{24}$/.test(id)) {
      const user = await User.findById(id).select('pushSubscriptions');
      return user?.pushSubscriptions || [];
    }
    const user = inMemoryUsers.find(u => u._id === id);
    return user?.pushSubscriptions || [];
  },

  async removePushSubscription(endpoint) {
    if (isDbConnected()) {
      await User.updateMany(
        { "pushSubscriptions.endpoint": endpoint },
        { $pull: { pushSubscriptions: { endpoint: endpoint } } }
      );
      return;
    }
    inMemoryUsers.forEach(u => {
      if (u.pushSubscriptions) {
        u.pushSubscriptions = u.pushSubscriptions.filter(s => s.endpoint !== endpoint);
      }
    });
  },

  async createUser({ name, email, password, role, employeeId, department, phone, workStartTime, workEndTime }) {
    if (isDbConnected()) {
      const userCount = await User.countDocuments();
      const assignedRole = role || (userCount === 0 ? 'admin' : 'trainee');
      return await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: assignedRole,
        employeeId: employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`,
        department: department || 'General',
        phone,
        workStartTime: workStartTime || '09:00',
        workEndTime: workEndTime || '17:00'
      });
    }

    const userCountMem = inMemoryUsers.length;
    const assignedRoleMem = role || (userCountMem === 0 ? 'admin' : 'trainee');
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      _id: `mem_user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      rawPassword: password,
      role: assignedRoleMem,
      employeeId: employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`,
      department: department || 'General',
      phone: phone || '',
      workStartTime: workStartTime || '09:00',
      workEndTime: workEndTime || '17:00',
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    inMemoryUsers.push(newUser);
    return newUser;
  },

  async setResetPasswordOtp(email, otp, expiresAt, resetToken) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();
    const expiryDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);

    if (isDbConnected()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) return null;
      user.resetPasswordOtp = cleanOtp;
      user.resetPasswordExpires = expiryDate;
      user.resetPasswordToken = resetToken;
      await user.save();
      return user;
    }

    const user = inMemoryUsers.find(u => (u.email || '').toLowerCase() === cleanEmail);
    if (!user) return null;
    user.resetPasswordOtp = cleanOtp;
    user.resetPasswordExpires = expiryDate.toISOString();
    user.resetPasswordToken = resetToken;
    return user;
  },

  async verifyResetPasswordOtp(email, otp) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();
    const now = Date.now();

    if (isDbConnected()) {
      const user = await User.findOne({ 
        email: cleanEmail,
        resetPasswordOtp: cleanOtp,
        resetPasswordExpires: { $gt: new Date() }
      });
      return user;
    }

    const user = inMemoryUsers.find(u => 
      (u.email || '').toLowerCase() === cleanEmail &&
      String(u.resetPasswordOtp || '').trim() === cleanOtp &&
      new Date(u.resetPasswordExpires).getTime() > now
    );
    return user || null;
  },

  async resetPasswordWithToken(email, resetToken, newPassword) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanToken = (resetToken || '').trim();

    if (isDbConnected()) {
      const user = await User.findOne({
        email: cleanEmail,
        resetPasswordToken: cleanToken,
      });
      if (!user) return null;
      user.password = newPassword;
      user.resetPasswordOtp = undefined;
      user.resetPasswordExpires = undefined;
      user.resetPasswordToken = undefined;
      await user.save();
      return user;
    }

    const user = inMemoryUsers.find(u => 
      (u.email || '').toLowerCase() === cleanEmail &&
      (u.resetPasswordToken || '').trim() === cleanToken
    );
    if (!user) return null;
    user.password = await bcrypt.hash(newPassword, 10);
    user.rawPassword = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordToken = undefined;
    return user;
  },

  async comparePassword(user, enteredPassword) {
    if (isDbConnected() && typeof user.comparePassword === 'function') {
      return await user.comparePassword(enteredPassword);
    }
    if (user.rawPassword && user.rawPassword === enteredPassword) {
      return true;
    }
    if (user.password) {
      return await bcrypt.compare(enteredPassword, user.password);
    }
    return false;
  },

  async getUsers(roleFilter) {
    const query = (roleFilter && roleFilter !== 'all') ? { role: roleFilter } : {};
    if (isDbConnected()) {
      return await User.find(query).select('-password');
    }
    if (roleFilter && roleFilter !== 'all') {
      return inMemoryUsers.filter(u => u.role === roleFilter);
    }
    return inMemoryUsers;
  },

  async updateUser(id, updateData) {
    if (isDbConnected() && /^[0-9a-fA-F]{24}$/.test(id)) {
      const user = await User.findById(id);
      if (user) {
        Object.assign(user, updateData);
        if (updateData.password) {
          user.password = updateData.password;
        }
        return await user.save();
      }
    }

    const idx = inMemoryUsers.findIndex(u => u._id === id);
    if (idx === -1) return null;

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...updateData };
    return inMemoryUsers[idx];
  },

  async deleteUser(id) {
    if (isDbConnected() && /^[0-9a-fA-F]{24}$/.test(id)) {
      const deletedUser = await User.findByIdAndDelete(id);
      if (deletedUser) {
        try {
          await Attendance.deleteMany({ user: id });
        } catch (e) {
          console.warn('Failed to clean up attendance records for deleted user:', e.message);
        }
        return true;
      }
    }
    const idx = inMemoryUsers.findIndex(u => u._id === id);
    if (idx !== -1) {
      inMemoryUsers.splice(idx, 1);
      return true;
    }
    return false;
  },

  // --- LOCATION METHODS ---
  async getLocations(filter = {}) {
    if (isDbConnected()) {
      return await Location.find(filter);
    }
    return inMemoryLocations.filter(l => {
      if (filter.status && l.status !== filter.status) return false;
      return true;
    });
  },

  async createLocation(locationData) {
    if (isDbConnected()) {
      return await Location.create(locationData);
    }
    const newLoc = {
      _id: `mem_loc_${Date.now()}`,
      ...locationData,
      status: locationData.status || 'Active',
      createdAt: new Date().toISOString()
    };
    inMemoryLocations.push(newLoc);
    return newLoc;
  },

  async updateLocation(id, updateData) {
    if (isDbConnected() && /^[0-9a-fA-F]{24}$/.test(id)) {
      const loc = await Location.findByIdAndUpdate(id, updateData, { new: true });
      if (loc) return loc;
    }
    const idx = inMemoryLocations.findIndex(l => l._id === id);
    if (idx === -1) return null;
    inMemoryLocations[idx] = { ...inMemoryLocations[idx], ...updateData };
    return inMemoryLocations[idx];
  },

  async deleteLocation(id) {
    if (isDbConnected() && /^[0-9a-fA-F]{24}$/.test(id)) {
      const loc = await Location.findByIdAndDelete(id);
      if (loc) return true;
    }
    const idx = inMemoryLocations.findIndex(l => l._id === id);
    if (idx !== -1) {
      inMemoryLocations.splice(idx, 1);
      return true;
    }
    return false;
  },

  // --- ATTENDANCE METHODS ---
  async findAttendanceToday(userId, dateStr) {
    if (isDbConnected()) {
      return await Attendance.findOne({ user: userId, date: dateStr });
    }
    return inMemoryAttendance.find(a => (a.user?._id === userId || a.user === userId) && a.date === dateStr) || null;
  },

  async createAttendance(data) {
    if (isDbConnected()) {
      return await Attendance.create(data);
    }
    const userObj = inMemoryUsers.find(u => u._id === data.user) || { _id: data.user, name: 'Worker', department: 'General' };
    const newRecord = {
      _id: `mem_att_${Date.now()}`,
      ...data,
      user: {
        _id: userObj._id,
        name: userObj.name,
        department: userObj.department,
        employeeId: userObj.employeeId
      },
      createdAt: new Date().toISOString()
    };
    inMemoryAttendance.unshift(newRecord);
    return newRecord;
  },

  async getAttendanceList() {
    if (isDbConnected()) {
      return await Attendance.find().populate('user', 'name department employeeId').sort({ createdAt: -1 });
    }
    return [...inMemoryAttendance];
  },

  async getWorkerAttendance(userId) {
    if (isDbConnected()) {
      return await Attendance.find({ user: userId }).sort({ date: -1 });
    }
    return inMemoryAttendance.filter(a => a.user?._id === userId || a.user === userId);
  },

  async updateAttendance(id, updateData) {
    if (isDbConnected() && /^[0-9a-fA-F]{24}$/.test(id)) {
      const att = await Attendance.findById(id);
      if (att) {
        Object.assign(att, updateData);
        return await att.save();
      }
    }
    const idx = inMemoryAttendance.findIndex(a => a._id === id);
    if (idx === -1) return null;
    inMemoryAttendance[idx] = { ...inMemoryAttendance[idx], ...updateData };
    return inMemoryAttendance[idx];
  },

  async deleteAttendance(id) {
    if (isDbConnected() && /^[0-9a-fA-F]{24}$/.test(id)) {
      const att = await Attendance.findById(id);
      if (att) {
        await att.deleteOne();
        return true;
      }
    }
    const idx = inMemoryAttendance.findIndex(a => a._id === id);
    if (idx !== -1) {
      inMemoryAttendance.splice(idx, 1);
      return true;
    }
    return false;
  },

  async getAdminDashboardStats() {
    const today = new Date().toISOString().split('T')[0];

    // Helper to build 14-day trends from an array of attendance records
    const buildDailyTrends = (records) => {
      const trends = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Format label as "Aug 11"
        const dateObj = new Date(d);
        const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const dayRecords = records.filter(a => a.date === dateStr);
        const onTime = dayRecords.filter(a => a.status === 'present' || a.status === 'on-time').length;
        const late = dayRecords.filter(a => a.status === 'late').length;
        const total = dayRecords.length;
        const clockedOut = dayRecords.filter(a => a.checkOutTime).length;
        const onTimeRate = total > 0 ? Math.round((onTime / total) * 100) : 0;

        trends.push({
          fullDate: dateStr,
          date: dateLabel,
          onTime,
          late,
          total,
          clockedOut,
          onTimeRate
        });
      }
      return trends;
    };

    if (isDbConnected()) {
      const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' } });
      const checkInsToday = await Attendance.countDocuments({ date: today });
      const lateToday = await Attendance.countDocuments({ date: today, status: 'late' });
      const onTimeToday = checkInsToday - lateToday;
      const presentPercentage = totalEmployees > 0 ? Math.round((checkInsToday / totalEmployees) * 100) : 0;

      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const recentAttendance = await Attendance.find({ date: { $gte: fourteenDaysAgo } });
      const dailyTrends = buildDailyTrends(recentAttendance);

      const topEmployees = await Attendance.aggregate([
        { $match: { status: 'present' } },
        { $group: { _id: "$user", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDetails' } },
        { $unwind: '$userDetails' }
      ]);

      return {
        totalEmployees,
        checkInsToday,
        lateToday,
        onTimeToday,
        presentPercentage,
        dailyTrends,
        topEmployees
      };
    }

    // In-memory stats
    const totalEmployees = inMemoryUsers.filter(u => u.role !== 'admin').length;
    const checkInsToday = inMemoryAttendance.filter(a => a.date === today).length;
    const lateToday = inMemoryAttendance.filter(a => a.date === today && a.status === 'late').length;
    const onTimeToday = checkInsToday - lateToday;
    const presentPercentage = totalEmployees > 0 ? Math.round((checkInsToday / totalEmployees) * 100) : 0;

    const dailyTrends = buildDailyTrends(inMemoryAttendance);

    // Department breakdown
    const deptMap = {};
    inMemoryAttendance.forEach(a => {
      const dept = a.user?.department || 'General';
      if (!deptMap[dept]) deptMap[dept] = { department: dept, onTime: 0, late: 0, total: 0 };
      deptMap[dept].total += 1;
      if (a.status === 'late') deptMap[dept].late += 1;
      else deptMap[dept].onTime += 1;
    });

    return {
      totalEmployees,
      checkInsToday,
      lateToday,
      onTimeToday,
      presentPercentage,
      dailyTrends,
      departmentStats: Object.values(deptMap),
      topEmployees: inMemoryUsers.filter(u => u.role === 'worker').slice(0, 5).map(u => ({
        _id: u._id,
        count: inMemoryAttendance.filter(a => (a.user?._id === u._id || a.user === u._id) && a.status === 'present').length,
        userDetails: u
      }))
    };
  },

  // --- SETTINGS METHODS ---
  async getSetting(key, defaultValue = null) {
    if (isDbConnected()) {
      const doc = await SystemSettings.findOne({ key });
      return doc ? doc.value : defaultValue;
    }
    // Simple in-memory fallback since no global memory struct exists for settings yet
    if (!global.inMemorySettings) global.inMemorySettings = {};
    return global.inMemorySettings[key] !== undefined ? global.inMemorySettings[key] : defaultValue;
  },

  async setSetting(key, value) {
    if (isDbConnected()) {
      await SystemSettings.findOneAndUpdate(
        { key },
        { value },
        { upsert: true, new: true }
      );
      return true;
    }
    if (!global.inMemorySettings) global.inMemorySettings = {};
    global.inMemorySettings[key] = value;
    return true;
  },

  // --- MESSAGE METHODS ---
  async deleteMessage(messageId, userId, userRole) {
    const checkInMemory = () => {
      const idx = inMemoryMessages.findIndex(m => m._id === messageId);
      if (idx === -1) return false;
      const msg = inMemoryMessages[idx];
      const senderId = msg.sender?._id ? msg.sender._id.toString() : msg.sender?.toString();
      const currentUserId = userId?._id ? userId._id.toString() : userId?.toString();
      if (userRole === 'admin' || senderId === currentUserId) {
        inMemoryMessages.splice(idx, 1);
        return true;
      }
      return false;
    };

    if (isDbConnected()) {
      if (!/^[0-9a-fA-F]{24}$/.test(messageId)) {
        return checkInMemory();
      }
      const msg = await Message.findById(messageId);
      if (!msg) return false;
      
      const senderId = msg.sender?._id ? msg.sender._id.toString() : msg.sender?.toString();
      const currentUserId = userId?._id ? userId._id.toString() : userId?.toString();
      
      if (userRole === 'admin' || senderId === currentUserId) {
        await Message.findByIdAndDelete(messageId);
        return true;
      }
      return false;
    }
    
    return checkInMemory();
  },

  async getMessage(messageId) {
    if (isDbConnected()) {
      if (!/^[0-9a-fA-F]{24}$/.test(messageId)) {
        return inMemoryMessages.find(m => m._id === messageId) || null;
      }
      return await Message.findById(messageId).populate('sender', 'name avatar role');
    }
    return inMemoryMessages.find(m => m._id === messageId) || null;
  },

  async getThreadPreviews(userId) {
    let allMsgs = [];
    const isValidUser = /^[0-9a-fA-F]{24}$/.test(userId);
    if (isDbConnected() && isValidUser) {
      allMsgs = await Message.find({
        $or: [{ isBroadcast: true }, { sender: userId }, { receiver: userId }]
      }).sort({ createdAt: 1 }).lean();
    } else {
      allMsgs = inMemoryMessages.filter(m => 
        m.isBroadcast || m.sender === userId || m.receiver === userId
      ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    const previews = {};
    
    for (const m of allMsgs) {
      if (m.isBroadcast) {
        previews['broadcast'] = {
          text: m.text,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: false
        };
        continue;
      }
      
      const isMine = m.sender === userId || (m.sender && m.sender.toString() === userId.toString());
      const partnerId = isMine ? (m.receiver ? m.receiver.toString() : null) : (m.sender ? m.sender.toString() : null);
      
      if (partnerId) {
        if (!previews[partnerId]) previews[partnerId] = { unread: false, count: 0 };
        previews[partnerId].text = m.text || 'Sent an attachment';
        previews[partnerId].time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (!isMine && m.read === false) {
          previews[partnerId].unread = true;
          previews[partnerId].count++;
        } else if (!isMine && m.read === true) {
          // If a later message is read, it might reset our basic check but generally the DB handles the exact status.
        }
      }
    }
    return previews;
  },

  async getMessages(userId, otherUserId) {
    const isValidUser = /^[0-9a-fA-F]{24}$/.test(userId);
    const isValidOther = /^[0-9a-fA-F]{24}$/.test(otherUserId);

    if (isDbConnected() && isValidUser && (otherUserId === 'broadcast' || isValidOther)) {
      if (otherUserId === 'broadcast') {
        return await Message.find({ isBroadcast: true })
          .populate('sender', 'name avatar role')
          .sort({ createdAt: 1 });
      }

      const conditions = [
        { isBroadcast: true },
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ];

      return await Message.find({
        $or: conditions
      }).populate('sender', 'name avatar role').sort({ createdAt: 1 });
    }

    if (otherUserId === 'broadcast') {
      return inMemoryMessages.filter(m => m.isBroadcast).map(m => {
        const sender = inMemoryUsers.find(u => u._id === m.sender) || {};
        return { ...m, sender: { _id: sender._id, name: sender.name, avatar: sender.avatar, role: sender.role } };
      }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    return inMemoryMessages.filter(m => 
      m.isBroadcast || 
      (m.sender === userId && m.receiver === otherUserId) || 
      (m.sender === otherUserId && m.receiver === userId)
    ).map(m => {
      const sender = inMemoryUsers.find(u => u._id === m.sender) || {};
      return { ...m, sender: { _id: sender._id, name: sender.name, avatar: sender.avatar, role: sender.role } };
    }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  async createMessage(data) {
    if (isDbConnected()) {
      const msg = new Message(data);
      await msg.save();
      return await Message.findById(msg._id).populate('sender', 'name avatar role');
    }
    const newMessage = {
      ...data,
      read: false,
      _id: 'msg_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    inMemoryMessages.push(newMessage);
    const sender = inMemoryUsers.find(u => u._id === newMessage.sender) || {};
    return { ...newMessage, sender: { _id: sender._id, name: sender.name, avatar: sender.avatar, role: sender.role } };
  },

  async updateMessage(messageId, userId, data) {
    if (isDbConnected()) {
      if (!/^[0-9a-fA-F]{24}$/.test(messageId)) return null;
      const msg = await Message.findById(messageId);
      if (!msg) return null;
      
      const isGame = (msg.text && (msg.text.startsWith('{"type":"ludo"') || msg.text.startsWith('{"type":"chess"') || msg.text.startsWith('{"type":"tictactoe"') || msg.text.startsWith('{"type":"ludo_invite"'))) ||
                     (data.text && (data.text.startsWith('{"type":"ludo"') || data.text.startsWith('{"type":"chess"') || data.text.startsWith('{"type":"tictactoe"') || data.text.startsWith('{"type":"ludo_invite"')));

      const isSender = msg.sender.toString() === userId.toString();
      const isReceiver = msg.receiver && msg.receiver.toString() === userId.toString();
      if (!isSender && !isReceiver && !isGame) return null;

      Object.assign(msg, data);
      await msg.save();
      return await Message.findById(msg._id).populate('sender', 'name avatar role');
    }

    const idx = inMemoryMessages.findIndex(m => m._id === messageId);
    if (idx === -1) return null;
    const msg = inMemoryMessages[idx];
    
    const isGame = (msg.text && (msg.text.startsWith('{"type":"ludo"') || msg.text.startsWith('{"type":"chess"') || msg.text.startsWith('{"type":"tictactoe"') || msg.text.startsWith('{"type":"ludo_invite"'))) ||
                   (data.text && (data.text.startsWith('{"type":"ludo"') || data.text.startsWith('{"type":"chess"') || data.text.startsWith('{"type":"tictactoe"') || data.text.startsWith('{"type":"ludo_invite"')));

    const isSender = msg.sender === userId;
    const isReceiver = msg.receiver === userId;
    if (!isSender && !isReceiver && !isGame) return null;

    Object.assign(msg, data);
    const sender = inMemoryUsers.find(u => u._id === msg.sender) || {};
    return { ...msg, sender: { _id: sender._id, name: sender.name, avatar: sender.avatar, role: sender.role } };
  },

  async markMessagesAsRead(userId, senderId) {
    const isValidUser = /^[0-9a-fA-F]{24}$/.test(userId);
    const isValidSender = /^[0-9a-fA-F]{24}$/.test(senderId);

    if (isDbConnected() && isValidUser && isValidSender) {
      await Message.updateMany(
        { receiver: userId, sender: senderId, read: false },
        { $set: { read: true } }
      );
      return true;
    }
    
    inMemoryMessages.forEach(m => {
      if (m.receiver === userId && m.sender === senderId && !m.read) {
        m.read = true;
      }
    });
    return true;
  },

  // --- COMPETITIVE LEADERBOARD & PUNCTUALITY STREAKS ---
  async getLeaderboard(currentUserId) {
    let allUsers = [];
    if (isDbConnected()) {
      allUsers = await User.find({ role: { $ne: 'admin' } }).select('-password');
    } else {
      allUsers = inMemoryUsers.filter(u => u.role !== 'admin');
    }

    const allAtt = isDbConnected() 
      ? await Attendance.find() 
      : inMemoryAttendance;

    const enrichedUsers = allUsers.map(user => {
      const uId = String(user._id);
      const userAtt = allAtt.filter(a => {
        const aUid = String(a.user?._id || a.user);
        return aUid === uId;
      });

      const totalCheckIns = userAtt.length;
      const onTimeCount = userAtt.filter(a => a.status === 'present').length;
      const lateCount = userAtt.filter(a => a.status === 'late').length;
      const onTimeRate = totalCheckIns > 0 ? Math.round((onTimeCount / totalCheckIns) * 100) : 100;

      const streak = Number(user.punctualityStreak) || 0;
      const bestStreak = Number(user.bestStreak) || streak;
      const points = Number(user.earlyBirdPoints) || 0;
      const tier = getStreakTier(streak);

      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        department: user.department || 'General',
        employeeId: user.employeeId || 'EMP',
        role: user.role,
        punctualityStreak: streak,
        bestStreak: Math.max(bestStreak, streak),
        earlyBirdPoints: points,
        totalEarlyCheckIns: Number(user.totalEarlyCheckIns) || 0,
        totalOnTimeCheckIns: Number(user.totalOnTimeCheckIns) || onTimeCount,
        onTimeRate,
        totalCheckIns,
        streakTier: tier,
        lastPunctualDate: user.lastPunctualDate
      };
    });

    // Rank primarily by punctualityStreak DESC, then earlyBirdPoints DESC, then onTimeRate DESC
    enrichedUsers.sort((a, b) => {
      if (b.punctualityStreak !== a.punctualityStreak) {
        return b.punctualityStreak - a.punctualityStreak;
      }
      if (b.earlyBirdPoints !== a.earlyBirdPoints) {
        return b.earlyBirdPoints - a.earlyBirdPoints;
      }
      return b.onTimeRate - a.onTimeRate;
    });

    // Assign rank positions
    const leaderboard = enrichedUsers.map((u, idx) => ({
      ...u,
      rank: idx + 1,
      isTop3: idx < 3
    }));

    const myIndex = leaderboard.findIndex(u => String(u._id) === String(currentUserId));
    const myStats = myIndex !== -1 ? {
      ...leaderboard[myIndex],
      aheadOfYou: myIndex > 0 ? leaderboard[myIndex - 1] : null,
      totalCompetitors: leaderboard.length,
      percentile: Math.round(((leaderboard.length - myIndex) / Math.max(1, leaderboard.length)) * 100)
    } : null;

    const todayStr = new Date().toISOString().split('T')[0];
    const todaysEarlyBirds = allAtt.filter(a => a.date === todayStr && a.status === 'present').length;
    const streaksOnFireCount = leaderboard.filter(u => u.punctualityStreak >= 3).length;

    return {
      leaderboard,
      myStats,
      streaksOnFireCount,
      todaysEarlyBirds
    };
  },

  // --- SYSTEM SETTINGS METHODS ---
  async getSystemSetting(key, defaultValue = null) {
    if (isDbConnected()) {
      const setting = await SystemSettings.findOne({ key });
      return setting ? setting.value : defaultValue;
    }
    const setting = inMemorySettings.find(s => s.key === key);
    return setting ? setting.value : defaultValue;
  },

  async setSystemSetting(key, value) {
    if (isDbConnected()) {
      return await SystemSettings.findOneAndUpdate(
        { key },
        { value },
        { upsert: true, new: true }
      );
    }
    const idx = inMemorySettings.findIndex(s => s.key === key);
    if (idx !== -1) {
      inMemorySettings[idx].value = value;
    } else {
      inMemorySettings.push({ key, value });
    }
    return { key, value };
  }
};

