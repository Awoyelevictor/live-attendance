import express from 'express';
import { protect } from '../middleware/auth.js';
import { dbStore } from '../services/store.js';
import { webpush } from '../services/webpush.js';

const router = express.Router();

router.use(protect);

// @desc    Get all conversation partners
// @route   GET /api/messages/users
router.get('/users', async (req, res) => {
  try {
    const users = await dbStore.getUsers('all');
    // Filter out the current user
    const partners = users.filter(u => u._id.toString() !== req.user._id.toString());
    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get thread previews
// @route   GET /api/messages/threads/previews
router.get('/threads/previews', async (req, res) => {
  try {
    const previews = await dbStore.getThreadPreviews(req.user._id);
    res.json(previews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get messages between current user and another user
// @route   GET /api/messages/:otherUserId
router.get('/:otherUserId', async (req, res) => {
  try {
    const messages = await dbStore.getMessages(req.user._id, req.params.otherUserId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Mark messages from a sender as read
// @route   PUT /api/messages/:senderId/read
router.put('/:senderId/read', async (req, res) => {
  try {
    await dbStore.markMessagesAsRead(req.user._id, req.params.senderId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Send a message
// @route   POST /api/messages
router.post('/', async (req, res) => {
  try {
    const { receiver, text, mediaUrl, isBroadcast } = req.body;
    
    // Validate broadcast
    if (isBroadcast && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can broadcast' });
    }

    const message = await dbStore.createMessage({
      sender: req.user._id,
      receiver: isBroadcast ? null : receiver,
      isBroadcast: !!isBroadcast,
      text,
      mediaUrl
    });

    // Send Push Notifications
    try {
      const payload = JSON.stringify({
        title: isBroadcast ? `Broadcast from ${req.user.name}` : `New message from ${req.user.name}`,
        body: text || (mediaUrl ? '📷 Attachment received' : 'New message'),
        url: isBroadcast ? '/messages?type=broadcast' : `/messages?senderId=${req.user._id}`,
        tag: isBroadcast ? 'broadcast' : `chat-${req.user._id}`
      });

      if (isBroadcast) {
        const users = await dbStore.getUsers('all');
        for (const u of users) {
          const userIdStr = u._id.toString();
          if (userIdStr === req.user._id.toString()) continue;

          const subs = await dbStore.getPushSubscriptions(u._id);
          for (const sub of subs) {
            webpush.sendNotification(sub, payload).catch(err => {
              if (err.statusCode === 410 || err.statusCode === 404) {
                dbStore.removePushSubscription(sub.endpoint);
              }
            });
          }
        }
      } else if (receiver) {
        const subs = await dbStore.getPushSubscriptions(receiver);
        for (const sub of subs) {
          webpush.sendNotification(sub, payload).catch(err => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              dbStore.removePushSubscription(sub.endpoint);
            }
          });
        }
      }
    } catch (pushErr) {
      console.warn('Push notification failed:', pushErr);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

export default router;
