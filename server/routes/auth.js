import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { dbStore } from '../services/store.js';
import { sendOtpEmail } from '../services/mailer.js';

const router = express.Router();
const getJwtSecret = () => process.env.JWT_SECRET || 'attendance_dev_jwt_secret_2026';

const generateToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  try {
    const userExists = await dbStore.findUserByEmail(email);

    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const assignedRole = role === 'supervisor' ? 'supervisor' : 'trainee';
    const user = await dbStore.createUser({ name, email, password, role: assignedRole });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const user = await dbStore.findUserByEmail(email);

    if (user && (await dbStore.comparePassword(user, password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Server error during login' });
  }
});

// Helper to generate 6-digit numeric OTP
const generateNumericOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Initiate forgot password & dispatch OTP
// @route   POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: 'Please enter your registered email address' });
  }

  try {
    let user = await dbStore.findUserByEmail(email);
    
    // If not found, provide clear suggestions
    if (!user) {
      return res.status(404).json({ 
        message: `No account found for "${email}". Please enter a registered email address.`
      });
    }

    const otp = generateNumericOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const resetToken = crypto.randomBytes(24).toString('hex');

    await dbStore.setResetPasswordOtp(user.email, otp, expiresAt, resetToken);

    // Dispatch email
    const mailResult = await sendOtpEmail(user.email, user.name, otp);

    res.json({
      success: true,
      message: 'A 6-digit verification code has been dispatched to your email.',
      email: user.email,
      expiresAt,
      // Provide sandbox helper for instantaneous preview in development
      sandboxOtp: otp,
      previewUrl: mailResult.previewUrl || null,
      emailSent: mailResult.sent === true
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: error.message || 'Failed to process password reset request' });
  }
});

// @desc    Verify OTP code
// @route   POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const otp = (req.body.otp || '').toString().trim().replace(/\s+/g, '');

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and 6-digit OTP code are required' });
  }

  try {
    const user = await dbStore.verifyResetPasswordOtp(email, otp);

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP code. Please enter the correct 6-digit code or request a new one.' });
    }

    // Return the reset token for next step
    res.json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken: user.resetPasswordToken,
      email: user.email
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: error.message || 'Failed to verify OTP code' });
  }
});

// @desc    Resend OTP code
// @route   POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await dbStore.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateNumericOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const resetToken = crypto.randomBytes(24).toString('hex');

    await dbStore.setResetPasswordOtp(user.email, otp, expiresAt, resetToken);
    const mailResult = await sendOtpEmail(user.email, user.name, otp);

    res.json({
      success: true,
      message: 'A new 6-digit OTP code has been generated.',
      expiresAt,
      sandboxOtp: otp,
      previewUrl: mailResult.previewUrl || null,
      emailSent: mailResult.sent === true
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: error.message || 'Failed to resend OTP' });
  }
});

// @desc    Reset password using verified token
// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const resetToken = (req.body.resetToken || '').trim();
  const { newPassword } = req.body;

  if (!email || !resetToken || !newPassword) {
    return res.status(400).json({ message: 'Missing required reset information' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const user = await dbStore.resetPasswordWithToken(email, resetToken, newPassword);

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset session. Please restart the process.' });
    }

    res.json({
      success: true,
      message: 'Your password has been successfully reset! You can now sign in.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: error.message || 'Failed to reset password' });
  }
});

export default router;
