import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Organization } from '../models/Organization';
import { RegisterSchema, LoginSchema } from '../validators/authValidator';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { NotificationService } from '../services/notificationService';
import { normalizeRole } from '../utils/roleUtils';

const JWT_SECRET = process.env.JWT_SECRET || 'foodbridge_super_secret_jwt_key_hackathon_2025_dev_mode';

const generateToken = (user: IUser) => {
  const canonicalRole = normalizeRole(user.role);
  return jwt.sign(
    { userId: (user._id as any).toString(), role: canonicalRole, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Explicit security check: Never allow public users to self-register as administrators
    if ((req.body as any)?.role === 'admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Public self-registration as administrator is strictly prohibited. Admin accounts must be initialized via seed scripts.',
      });
      return;
    }

    const parseResult = RegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
      return;
    }

    const data = parseResult.data;
    const normalizedEmail = data.email.trim().toLowerCase();
    const canonicalRole = normalizeRole(data.role);

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail }).exec();
    if (existingUser) {
      res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists. Please sign in.' });
      return;
    }

    // Default coordinates based on city if not provided
    const coordinates: [number, number] = data.coordinates || [77.2090, 28.6139]; // Delhi NCR default

    // Create Organization first
    const isNgoRole = canonicalRole === 'ngo';
    const organization = new Organization({
      name: data.organizationName,
      type: data.organizationType,
      description: isNgoRole ? 'Community food rescue and shelter organization' : 'Food provider kitchen',
      registrationNumber: data.registrationNumber || '',
      contactPerson: data.name,
      phone: data.phone,
      email: normalizedEmail,
      location: {
        type: 'Point',
        coordinates,
        address: data.address,
        city: data.city,
      },
      verificationStatus: 'pending', // All new registrations (Food Providers and NGOs) default to pending administrator review
      capacity: {
        maxMealsPerDay: data.maxMealsPerDay || 150,
        currentAvailableCapacity: data.maxMealsPerDay || 150,
        hasRefrigeration: data.hasRefrigeration ?? true,
        hasWarmStorage: data.hasWarmStorage ?? true,
        hasTransportFleet: data.hasTransportFleet ?? false,
        activeVolunteers: 8,
      },
      isDemo: false,
    });

    await organization.save();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Create User with authoritative canonical role
    const user = new User({
      name: data.name,
      email: normalizedEmail,
      passwordHash,
      role: canonicalRole,
      phone: data.phone,
      organizationId: organization._id,
      isActive: true,
    });

    await user.save();

    // Trigger Automated Registration Confirmation (In-App, Email, SMS)
    // Non-blocking: External email/SMS gateway errors must never fail or roll back a successful registration
    try {
      const dispatchResult = await NotificationService.sendRegistrationConfirmation({
        user,
        organization,
        sendSms: Boolean(user.phone),
      });
      console.log(`[Registration Email] Dispatched confirmation workflow for ${user.email} (${canonicalRole}) | Status: ${dispatchResult.emailLog?.status || 'queued'} | MessageId: ${dispatchResult.emailLog?.id || 'n/a'}`);
    } catch (notifErr: any) {
      console.error('[Registration Email Warning] Notification dispatch deferred or failed:', notifErr?.message || notifErr);
    }

    const token = generateToken(user);

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: canonicalRole,
        phone: user.phone,
        organization: {
          id: organization._id,
          name: organization.name,
          type: organization.type,
          city: organization.location.city,
          verificationStatus: organization.verificationStatus,
        },
      },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists. Please sign in.' });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation Error', details: parseResult.error.format() });
      return;
    }

    const { email, password, portal } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).populate('organizationId').exec();
    if (!user) {
      res.status(401).json({ error: 'Invalid Credentials', message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid Credentials', message: 'Invalid email or password' });
      return;
    }

    // Authoritative canonical role for session token
    const canonicalRole = normalizeRole(user.role);

    // Enforce role-based portal boundaries: Selecting a portal can never elevate or alter a user's role
    if (portal) {
      if (portal === 'admin' && canonicalRole !== 'admin') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You do not have permission to access the Administrator portal.',
        });
        return;
      }
      if (portal === 'provider' && canonicalRole !== 'provider') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: This portal is reserved for registered Food Providers.',
        });
        return;
      }
      if (portal === 'ngo' && canonicalRole !== 'ngo') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: This portal is reserved for registered NGOs and Shelters.',
        });
        return;
      }
    }

    const token = generateToken(user);
    const org = user.organizationId as any;

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: canonicalRole,
        phone: user.phone,
        organization: org ? {
          id: org._id,
          name: org.name,
          type: org.type,
          city: org.location?.city,
          location: org.location,
          verificationStatus: org.verificationStatus,
          capacity: org.capacity,
          compatibleCategories: org.compatibleCategories,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const demoLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const isDemoAllowed = process.env.ENABLE_DEMO_LOGIN === 'true' || process.env.NODE_ENV !== 'production';
    if (!isDemoAllowed) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Demonstration shortcuts are strictly disabled in production environments.',
      });
      return;
    }

    const { role } = req.body;
    const targetRole = normalizeRole(role);

    const demoEmailMap: Record<string, string> = {
      provider: 'provider@foodbridge.org',
      ngo: 'ngo@hopekitchen.org',
      admin: process.env.ADMIN_EMAIL || 'admin@foodbridge.org',
    };

    const targetEmail = (demoEmailMap[targetRole] || 'provider@foodbridge.org').trim().toLowerCase();
    let user = await User.findOne({ email: targetEmail }).populate('organizationId').exec();

    // Fallback: If specific demo user does not exist, find any verified user matching targetRole
    if (!user) {
      user = await User.findOne({ role: targetRole }).populate('organizationId').exec();
    }

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: `No active account available for demo role "${targetRole}".`,
      });
      return;
    }

    const canonicalRole = normalizeRole(user.role);
    const token = generateToken(user);
    const org = user.organizationId as any;

    res.json({
      message: `Signed in as demonstration persona (${canonicalRole.toUpperCase()})`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: canonicalRole,
        phone: user.phone,
        organization: org ? {
          id: org._id,
          name: org.name,
          type: org.type,
          city: org.location?.city,
          location: org.location,
          verificationStatus: org.verificationStatus,
          capacity: org.capacity,
          compatibleCategories: org.compatibleCategories,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // Authoritative canonical role for session response
    const canonicalRole = normalizeRole(req.user.role);

    const org = req.user.organizationId as any;

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: canonicalRole,
        phone: req.user.phone,
        organization: org ? {
          id: org._id,
          name: org.name,
          type: org.type,
          location: org.location,
          verificationStatus: org.verificationStatus,
          capacity: org.capacity,
          compatibleCategories: org.compatibleCategories,
        } : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};
