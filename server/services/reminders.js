import { dbStore } from './store.js';
import { webpush } from './webpush.js';

export const startReminderJob = () => {
  console.log('⏰ Starting clock-in reminder job (checking every 5 minutes)');
  
  setInterval(async () => {
    try {
      const now = new Date();
      const day = now.getDay();
      if (day === 0 || day === 6) return;
      
      const isSystemActive = await dbStore.getSystemSetting('isSystemActive', true);
      if (!isSystemActive) return;

      const todayStr = now.toISOString().split('T')[0];
      const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      const [currentH, currentM] = currentTimeStr.split(':').map(Number);
      const currentTotalMins = currentH * 60 + currentM;

      const workers = await dbStore.getUsers('trainee');
      const locations = await dbStore.getLocations({ status: 'Active' });
      const activeLoc = locations[0] || { clockInTime: '09:00', clockOutTime: '17:00' };

      for (const worker of workers) {
        const shiftStart = worker.workStartTime || activeLoc.clockInTime || '09:00';
        const shiftEnd = worker.workEndTime || activeLoc.clockOutTime || '17:00';
        
        const [startH, startM] = shiftStart.split(':').map(Number);
        const shiftStartMins = startH * 60 + startM;

        const [endH, endM] = shiftEnd.split(':').map(Number);
        const shiftEndMins = endH * 60 + endM;

        // Reminder 1: Clock-In (15 mins before)
        const checkInReminderTime = shiftStartMins - 15;
        if (currentTotalMins >= checkInReminderTime && currentTotalMins < shiftStartMins) {
          const attendance = await dbStore.findAttendanceToday(worker._id, todayStr);
          if (!attendance) {
            await sendPushReminder(worker, {
              title: 'Shift Starts Soon!',
              body: `Your shift starts at ${shiftStart}. Remember to clock in!`,
              url: '/worker/dashboard',
              tag: `reminder-in-${worker._id}-${todayStr}`
            });
          }
        }

        // Reminder 2: Clock-Out (At shift end)
        if (currentTotalMins >= shiftEndMins && currentTotalMins < shiftEndMins + 15) {
          const attendance = await dbStore.findAttendanceToday(worker._id, todayStr);
          if (attendance && !attendance.checkOutTime) {
            await sendPushReminder(worker, {
              title: 'Shift Ended!',
              body: `Your shift ended at ${shiftEnd}. Don't forget to clock out!`,
              url: '/worker/dashboard',
              tag: `reminder-out-${worker._id}-${todayStr}`
            });
          }
        }
      }
    } catch (error) {
      console.error('Reminder job error:', error);
    }
  }, 5 * 60000);
};

async function sendPushReminder(user, data) {
  try {
    const subs = await dbStore.getPushSubscriptions(user._id);
    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url,
      tag: data.tag
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await dbStore.removePushSubscription(sub.endpoint);
        }
      }
    }
  } catch (err) {
    console.error('Failed to send push reminder:', err);
  }
}
