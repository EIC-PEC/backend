import { PassType } from '@prisma/client';

export interface PassTierMetadata {
  id: string;
  enumType: PassType;
  title: string;
  tagline: string;
  feeAmount: number;
  feeDisplay: string;
  badgeTitle: string;
  category: 'student' | 'founder' | 'group' | 'ambassador';
  features: string[];
  popular?: boolean;
}

export const PASS_TIERS_CATALOG: PassTierMetadata[] = [
  {
    id: 'student-general',
    enumType: PassType.STUDENT_GENERAL,
    title: 'Student General Pass',
    tagline: 'Access to all Keynotes, Panels, and open Startup Expo floor.',
    feeAmount: 0,
    feeDisplay: 'FREE / ₹0',
    badgeTitle: 'GENERAL DELEGATE',
    category: 'student',
    features: [
      'Access to all Keynotes & Panels',
      'Startup Expo floor pass (Both Days)',
      'E-Certificate of Participation',
      'Summit Delegate Kit & Swag',
    ],
  },
  {
    id: 'pitch-competition',
    enumType: PassType.FOUNDER_PITCH,
    title: 'Startup Founder & Pitch Pass',
    tagline: 'Entry for early-stage founders to pitch to VCs and exhibit at Expo.',
    feeAmount: 799,
    feeDisplay: '₹799 / Team',
    badgeTitle: 'PITCH DELEGATE',
    category: 'founder',
    popular: true,
    features: [
      'Pitch Competition entry (Up to 4 members)',
      '1-on-1 Investor Deck Review',
      'Priority application for Investor Open Hours',
      'Startup Expo booth discount eligibility',
    ],
  },
  {
    id: 'hackathon-builder',
    enumType: PassType.HACKATHON_BUILDER,
    title: 'Hackathon Builder Pass',
    tagline: '24-hour sprint to build, hack, and win ₹15L+ pool.',
    feeAmount: 199,
    feeDisplay: '₹199 / Hacker',
    badgeTitle: 'HACKER DELEGATE',
    category: 'student',
    features: [
      '24-Hour Hackathon Arena access (Team of 2-4)',
      'Midnight meals, energy drinks & snacks included',
      '$500+ cloud & API developer credits',
      'Mentorship from senior tech leads',
    ],
  },
  {
    id: 'campus-ambassador',
    enumType: PassType.CAMPUS_AMBASSADOR,
    title: 'Campus Ambassador Leader',
    tagline: 'Represent PEC Summit at your college & earn exclusive VIP perks.',
    feeAmount: 0,
    feeDisplay: 'FREE / Ambassador',
    badgeTitle: 'CA LEADER',
    category: 'ambassador',
    features: [
      'Personalized Referral Code & Leaderboard entry',
      'Free VIP Summit Pass upon 10+ student referrals',
      'Exclusive Certificate of Leadership from E-Cell PEC',
      'Direct interaction with organizing committee',
    ],
  },
];
