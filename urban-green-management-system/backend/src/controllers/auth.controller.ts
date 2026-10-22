
import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/management/User';
import { env } from '../config/env';

export async function register(req: Request, res: Response) {
  try {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';

    const password =
      typeof req.body?.password === 'string'
        ? req.body.password
        : '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: 'Password must be between 8 and 72 characters.',
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({ email, passwordHash });

    return res.status(201).json({
      message: 'Account created successfully. You can now sign in.',
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    console.error('Registration failed:', error);
    return res.status(500).json({
      message: 'Unable to create account right now.',
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';

    const password =
      typeof req.body?.password === 'string'
        ? req.body.password
        : '';

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      env.JWT_SECRET,
      { expiresIn: '1d' },
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({
      message: 'Unable to sign in right now.',
    });
  }
}
