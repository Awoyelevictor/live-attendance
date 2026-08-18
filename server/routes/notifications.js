import express from 'express';
import { protect } from '../middleware/auth.js';
import { dbStore } from '../services/store.js';
import { webpush, publicVapidKey } from '../services/webpush.js';

const router = express.Router();

router.use(protect);

// @desc    Get VAPID public key
// @route   GET /api/notifications/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: publicVapidKey });
});

// @desc    Subscribe to push notifications
// @route   POST /api/notifications/subscribe
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({ message: 'Subscription object is required' });
    }
    
    await dbStore.savePushSubscription(req.user._id, subscription);
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Send test push notification to current user
// @route   POST /api/notifications/test-push
router.post('/test-push', async (req, res) => {
  try {
    const subs = await dbStore.getPushSubscriptions(req.user._id);
    if (!subs || subs.length === 0) {
      return res.status(404).json({ message: 'No push subscription found. Please allow notifications first.' });
    }

    const payload = JSON.stringify({
      title: 'Attendly Notifications Active!',
      body: `Hello ${req.user.name}, push notifications are working on this device!`,
      url: '/messages',
      tag: 'test-push-' + Date.now()
    });

    let sentCount = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub, payload);
        sentCount++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await dbStore.removePushSubscription(sub.endpoint);
        }
      }
    }

    res.json({ message: `Test push sent to ${sentCount} device(s).` });
  } catch (error) {
    console.error('Test push error:', error);
    res.status(500).json({ message: error.message || 'Failed to send test push' });
  }
});

export default router;
