import { PassType } from '@prisma/client'

export interface PassTierMetadata {
  id: string
  enumType: PassType
  title: string
  tagline: string
  feeAmount: number
  feeDisplay: string
  badgeTitle: string
  category: 'student' | 'founder' | 'group' | 'ambassador'
  features: string[]
  popular?: boolean
}

export const PASS_TIERS_CATALOG: PassTierMetadata[] = [
  {
    id: 'free-delegate',
    enumType: PassType.STUDENT_GENERAL,
    title: 'Free Delegate Pass',
    tagline: 'Startup expo, speaker sessions, panel discussions.',
    feeAmount: 0,
    feeDisplay: 'FREE',
    badgeTitle: 'FREE DELEGATE',
    category: 'student',
    features: [
      'Startup expo access',
      'Keynote speaker sessions',
      'Panel discussions',
      'Summit Delegate Kit',
    ],
  },
  {
    id: 'all-access',
    enumType: PassType.STUDENT_GENERAL,
    title: 'All-Access Pass',
    tagline: 'All other competitions, interns fair, exclusive workshops + delegate access.',
    feeAmount: 249,
    feeDisplay: '₹249',
    badgeTitle: 'ALL-ACCESS DELEGATE',
    category: 'student',
    popular: true,
    features: [
      'All other competitions',
      'Interns fair entry',
      'Exclusive workshops',
      'Startup expo, speaker sessions & panel discussions',
    ],
  },
  {
    id: 'hackathon',
    enumType: PassType.HACKATHON_BUILDER,
    title: 'Hackathon Pass',
    tagline: 'Hackathon participation.',
    feeAmount: 350,
    feeDisplay: '₹350',
    badgeTitle: 'HACKATHON PARTICIPANT',
    category: 'student',
    features: [
      'Hackathon participation (Team of 2-4)',
      'Midnight meals, energy drinks & developer swag',
      '$500+ cloud & API developer credits',
      'Mentorship from senior tech leads',
    ],
  },
  {
    id: 'ultimate-combo',
    enumType: PassType.HACKATHON_BUILDER,
    title: 'Ultimate Combo Pass',
    tagline: 'Hackathon + all competitions + interns fair + workshops + delegate access.',
    feeAmount: 499,
    feeDisplay: '₹499',
    badgeTitle: 'ULTIMATE COMBO',
    category: 'student',
    features: [
      'Hackathon participation',
      'All other competitions',
      'Interns fair entry',
      'Exclusive workshops',
      'Startup expo, speaker sessions & panel discussions',
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
    features: [
      'Pitch Competition entry (Up to 4 members)',
      '1-on-1 Investor Deck Review',
      'Priority application for Investor Open Hours',
      'Startup Expo booth discount eligibility',
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
]
