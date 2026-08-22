// prisma/seed.ts
// Seeds the CMS database from the master content dataset for MongoDB.
// Run with: npx ts-node prisma/seed.ts OR npm run db:seed

import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with complete Summit CMS datasets...');

  // ── Seed Demo Staff & Admin Users ─────────────────────────────────────────
  const defaultPasswordHash = await argon2.hash('PecSummit@2026');
  const demoUsers = [
    { email: 'admin@pecsummit.com', name: 'Summit Admin', role: Role.ADMIN, referralCode: 'PECADMIN' },
    { email: 'volunteer@pecsummit.com', name: 'Gate Staff', role: Role.GATE, referralCode: 'PECGATE' },
    { email: 'user@pecsummit.com', name: 'Sample Attendee', role: Role.USER, referralCode: 'PECUSER' },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        referralCode: u.referralCode,
        passwordHash: defaultPasswordHash,
      },
      update: {
        name: u.name,
        role: u.role,
        passwordHash: defaultPasswordHash,
      },
    });
  }
  console.log('  ✓ Demo Staff & Admin Accounts (admin@pecsummit.com / PecSummit@2026)');

  // ── SiteConfig ────────────────────────────────────────────────────────────
  await prisma.siteConfig.upsert({
    where: { id: 'global' },
    create: {
      id: 'global',
      heroTitle: 'PEC E-SUMMIT 2026',
      heroSubtitle: 'IGNITING ENTREPRENEURSHIP & INNOVATION',
      summitDates: 'MARCH 15–16, 2026',
      summitVenue: 'Punjab Engineering College, Sector 12, Chandigarh',
      stats: { attendees: '3000+', speakers: '40+', prizePool: '₹15L+', editions: '7' },
      contacts: {
        faculty: [
          { role: 'Faculty Coordinator', name: 'Dr. Simranjit Singh', phone: '+91 98725 52898' },
          { role: 'Faculty Co-coordinator', name: 'Dr. Sudesh Rani', phone: '+91 98768 60085' },
        ],
        studentLeadership: [
          { role: 'Student Convener', name: 'Simarpreet Kaur', phone: '+91 84271 46574' },
          { role: 'Student Co-convener', name: 'Shubham Mangal', phone: '+91 78349 75811' },
          { role: 'Student Co-convener', name: 'Vedansh Singh', phone: '+91 88268 73264' },
          { role: 'Marketing Head', name: 'Japneet Pathania', phone: '+91 85449 18700' },
        ],
        location:
          'Entrepreneurship & Incubation Cell - Incubator (Near Siemens Lab), Punjab Engineering College, Sector-12 (160012), Chandigarh',
        emails: ['eicpec@pec.edu.in', 'esummitpr.pec@gmail.com'],
      },
    },
    update: {},
  });
  console.log('  ✓ SiteConfig');

  // ── Events (portfolio cards) ──────────────────────────────────────────────
  const events = [
    { number: '01', title: 'E-Summit Hackathon', category: 'Hackathon', eyebrow: '24-HOUR HACKATHON', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412327/esummit/gallery/pec_pitch_table.png', purpose: 'Build working software, AI workflows, and tech prototypes with mentorship from industry engineers.', delivery: '24-Hour continuous sprint, mentor checkpoint reviews, and live product demos before judges.', expectedParticipation: '500+ Hackers across 120 Teams', tags: ['AI & ML', 'Full-Stack', 'Open Source', '₹5.0L Prize Pool'], partner: 'Google Cloud & GitHub', order: 1 },
    { number: '02', title: 'Startup Internship & Career Fair', category: 'Career Fair', eyebrow: 'TALENT RECRUITMENT', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412333/esummit/gallery/pec_startup_fair.png', purpose: 'Direct recruitment drive connecting venture-backed startups and tech firms with top PEC engineering talent.', delivery: 'On-spot resume reviews, technical interviews, and internship/PPO opportunities.', expectedParticipation: '800+ Applicants across 35+ Companies', tags: ['Job Offers', 'Paid Internships', 'Direct Hiring'], partner: 'PEC Training & Placement Cell', order: 2 },
    { number: '03', title: 'R&D Innovation Conclave', category: 'Deep Tech', eyebrow: 'RESEARCH & PATENTS', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412331/esummit/gallery/pec_senate_roundtable.png', purpose: 'Showcasing commercializable research patents, hardware prototypes, and engineering lab innovations to venture mentors.', delivery: 'Prototype showcase, research poster presentations, and commercialization roundtables.', expectedParticipation: '40+ Research Projects', tags: ['Patents', 'Deep Tech', 'Commercialization'], partner: 'PEC Research & Consultation Wing', order: 3 },
    { number: '04', title: 'IPL Auction Strategy Challenge', category: 'Strategy & Finance', eyebrow: 'VALUATION & BIDDING', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412326/esummit/gallery/pec_pitch.jpg', purpose: 'Strategic simulation testing budget allocation, player valuation, team balance, and live bidding tactics.', delivery: 'Live simulated auction hall with real-time bidding rounds and squad optimization metrics.', expectedParticipation: '60+ Bidding Squads', tags: ['Live Auction', 'Budget Strategy', '₹1.0L Prize'], partner: 'PEC Sports & Finance Club', order: 4 },
    { number: '05', title: 'Ignite: Early-Stage Pitch', category: 'Pitch Competition', eyebrow: 'IDEA STAGE', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412317/esummit/gallery/pec_innovation_stage.png', purpose: 'Fast-paced elevator pitch competition for student founders and early-stage concepts.', delivery: '3-minute pitch followed by 2 minutes of direct Q&A and actionable feedback from angel investors.', expectedParticipation: '100+ Early Concepts', tags: ['Elevator Pitch', 'Angel Feedback', 'Grant Pool'], partner: 'Chandigarh Angels Network', order: 5 },
    { number: '06', title: 'Campus Treasure Hunt', category: 'Campus Quest', eyebrow: 'INTERACTIVE CHALLENGE', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412323/esummit/gallery/pec_lawn_mosaic.png', purpose: 'Campus-wide problem-solving quest exploring historic PEC landmarks and startup puzzle clues.', delivery: 'Time-bound clue checkpoints across campus with team leaderboards.', expectedParticipation: '600+ Participants', tags: ['Team Quest', 'Campus Challenge', 'Merchandise'], partner: 'PEC Student Council', order: 6 },
    { number: '07', title: 'E-Bazaar: Startup & Flea Market', category: 'Marketplace', eyebrow: 'STUDENT VENTURES', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412313/esummit/gallery/pec_group.png', purpose: 'Open-air marketplace for student-run D2C brands, artisanal products, and food pop-ups.', delivery: '2-Day dedicated exhibition area with thousands of attendee walk-ins.', expectedParticipation: '25+ Student Ventures', tags: ['D2C Pop-ups', 'Student Stalls', 'Live Sales'], partner: 'E-Cell PEC Community', order: 7 },
    { number: '08', title: 'BizTech: Business & Venture Quiz', category: 'Quiz Arena', eyebrow: 'BUSINESS & TECH TRIVIA', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412329/esummit/gallery/pec_senate_hall.png', purpose: 'Competitive business, tech industry history, and venture capital quiz challenge.', delivery: 'Buzzer rounds, rapid-fire trivia, and case identification stages.', expectedParticipation: '150+ Quiz Teams', tags: ['Brand Trivia', 'Venture Quiz', 'Cash Awards'], partner: 'SAASC PEC', order: 8 },
    { number: '09', title: 'Policy & Economic Conclave', category: 'Policy & Economics', eyebrow: 'MACRO DISCUSSION', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412306/esummit/gallery/pec_auditorium.png', purpose: 'Debate and discussion on macroeconomic trends, startup policy reforms, and digital public infrastructure.', delivery: 'Structured panel discussions followed by delegate Q&A.', expectedParticipation: '200+ Competitors', tags: ['Policy', 'Economics', 'Case Review'], partner: 'SAASC PEC', order: 9 },
    { number: '10', title: 'Campus Ambassador Network', category: 'Leadership', eyebrow: 'STUDENT LEADERSHIP', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412336/esummit/gallery/pec_team.png', purpose: 'Pan-India student outreach program driving summit awareness and registrations across 50+ universities.', delivery: 'Campus initiatives, referral milestones, leadership recognition, and VIP passes.', expectedParticipation: '150+ Campus Ambassadors', tags: ['Leadership', 'Outreach', 'Certificates'], partner: 'E-Cell PEC Outreach Wing', order: 10 },
    { number: '11', title: 'Keynote Sessions & Fireside Chats', category: 'Keynotes', eyebrow: 'FOUNDER KEYNOTES', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412321/esummit/gallery/pec_keynote_speaker.png', purpose: 'Keynote talks and fireside conversations with unicorn founders, investors, and industry leaders.', delivery: 'Main Auditorium sessions followed by interactive audience Q&A.', expectedParticipation: '1,500+ Attendees', tags: ['Founders', 'Fireside Chats', 'Q&A'], partner: 'PEC Alumni Association', order: 11 },
    { number: '12', title: 'The Ten-Minute Pitch: VC Dealroom', category: 'Venture Capital', eyebrow: 'INVESTOR DEALROOM', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412311/esummit/gallery/pec_funding_conclave.png', purpose: 'Closed-door pitching conclave connecting revenue-stage and high-traction student startups with VC funds.', delivery: 'Curated 1-on-1 pitch presentations and term-sheet discussions.', expectedParticipation: '20+ Top VCs & Angel Networks', tags: ['Term Sheets', 'VC Pitch', 'Due Diligence'], partner: 'Chandigarh Angels Network & VCs', order: 12 },
    { number: '13', title: 'Case Crack: Harvard Business Challenge', category: 'Case Competition', eyebrow: 'STRATEGY CASE', image: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412302/esummit/gallery/pec_admin_building.png', purpose: 'Solve real-world corporate growth, market expansion, and business turnaround cases.', delivery: 'Case presentation defense before management consultants and startup operators.', expectedParticipation: '50+ Case Squads', tags: ['Strategy', 'Consulting Case', '₹1.5L Pool'], partner: 'PEC Consulting & Management Group', order: 13 },
  ];

  for (const ev of events) {
    const existing = await prisma.event.findFirst({ where: { number: ev.number } });
    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: ev,
      });
    } else {
      await prisma.event.create({
        data: { ...ev, speakerIds: [] },
      });
    }
  }
  console.log(`  ✓ Events (${events.length})`);

  // ── Speakers ──────────────────────────────────────────────────────────────
  const speakers = [
    { name: 'Peyush Bansal', title: 'Co-Founder & CEO, Lenskart', role: 'Co-Founder & CEO', company: 'Lenskart', badge: 'KEYNOTE SPEAKER', category: 'keynote', bio: 'Peyush Bansal revolutionized D2C eyewear retail across Asia and has backed 50+ early-stage tech startups.', track: 'D2C & Retail Innovation', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', initials: 'PB', color: '#FF4D3D', order: 1 },
    { name: 'Anupam Mittal', title: 'Founder & CEO, People Group', role: 'Founder & CEO', company: 'People Group (Shaadi.com)', badge: 'SHARK INVESTOR', category: 'investor', bio: 'Pioneer of consumer internet platforms in India and active angel investor in over 200+ technology companies.', track: 'Angel Syndicates & VC Scaling', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', initials: 'AM', color: '#9B5CFF', order: 2 },
    { name: 'Dr. Ritesh Malik', title: 'Founder, Innov8 Coworking', role: 'Founder', company: 'Innov8 Coworking', badge: 'STARTUP MENTOR', category: 'mentor', bio: 'Doctor turned entrepreneur and ecosystem builder focused on prop-tech and healthcare innovation.', track: 'Zero to One Scaling', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', initials: 'RM', color: '#3DD9FF', order: 3 },
    { name: 'Gajendra Jangid', title: 'Co-Founder & CMO, CAR24', role: 'Co-Founder & CMO', company: 'CAR24', badge: 'PANELIST', category: 'panelist', bio: 'PEC Alumnus scaling auto-tech logistics across international markets.', track: 'Growth Strategy & Execution', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80', initials: 'GJ', color: '#FF8C42', order: 4 },
    { name: 'Upasana Taku', title: 'Co-Founder & COO, MobiKwik', role: 'Co-Founder & COO', company: 'MobiKwik', badge: 'FINTECH KEYNOTE', category: 'keynote', bio: 'Fintech pioneer leading digital payments infrastructure and financial inclusion for millions.', track: 'Fintech Infrastructure', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', initials: 'UT', color: '#FF4D3D', order: 5 },
    { name: 'Kunwar Sachdev', title: 'Founder, Su-Kam Power Systems', role: 'Founder', company: 'Su-Kam Power Systems', badge: 'HARDWARE MENTOR', category: 'mentor', bio: 'Solar energy and hardware manufacturing pioneer in North India.', track: 'Hardware & CleanTech Manufacturing', avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80', initials: 'KS', color: '#7ED321', order: 6 },
  ];

  for (const sp of speakers) {
    const existing = await prisma.speaker.findFirst({ where: { name: sp.name } });
    if (existing) {
      await prisma.speaker.update({
        where: { id: existing.id },
        data: sp,
      });
    } else {
      await prisma.speaker.create({
        data: sp,
      });
    }
  }
  console.log(`  ✓ Speakers (${speakers.length})`);

  // ── Sponsors ──────────────────────────────────────────────────────────────
  const sponsors = [
    { name: 'Google Cloud', tier: 'Title Sponsor', logoUrl: 'https://www.gstatic.com/devrel-devsite/prod/v0e0f589edd85502a40d78d7d0825db8ea5ef3b99ab4070381ee86977c9168730/cloud/images/social-icon-google-cloud-1200-630.png', websiteUrl: 'https://cloud.google.com', category: 'Cloud Infrastructure', order: 1 },
    { name: 'GitHub', tier: 'Powered By', logoUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png', websiteUrl: 'https://github.com', category: 'Developer Ecosystem', order: 2 },
    { name: 'Razorpay', tier: 'Associate Sponsor', logoUrl: 'https://razorpay.com/assets/razorpay-glyph.svg', websiteUrl: 'https://razorpay.com', category: 'Fintech Infrastructure', order: 3 },
    { name: 'AWS Startups', tier: 'Associate Sponsor', logoUrl: 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png', websiteUrl: 'https://aws.amazon.com/startups', category: 'Cloud Partner', order: 4 },
    { name: 'Canva', tier: 'Design Partner', logoUrl: 'https://about.canva.com/wp-content/uploads/sites/8/2019/03/canva-logo.png', websiteUrl: 'https://canva.com', category: 'Creative Tools', order: 5 },
    { name: 'Postman', tier: 'API Partner', logoUrl: 'https://assets.postman.com/brand/postman-logo-stacked.svg', websiteUrl: 'https://postman.com', category: 'API Platform', order: 6 },
    { name: 'Notion', tier: 'Productivity Partner', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png', websiteUrl: 'https://notion.so', category: 'Productivity', order: 7 },
    { name: 'Figma', tier: 'Design Partner', logoUrl: 'https://cdn.sanity.io/images/599r6htc/regionalized/46a76c802176eb17b04e12108de7e7e0f3736dc6-1024x1024.png', websiteUrl: 'https://figma.com', category: 'Design Ecosystem', order: 8 },
    { name: 'Vercel', tier: 'Ecosystem Partner', logoUrl: 'https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png', websiteUrl: 'https://vercel.com', category: 'Deployment', order: 9 },
    { name: 'Supabase', tier: 'Database Partner', logoUrl: 'https://supabase.com/brand-assets/supabase-logo-icon.png', websiteUrl: 'https://supabase.com', category: 'Backend Platform', order: 10 },
    { name: 'Polygon Labs', tier: 'Web3 Partner', logoUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.png', websiteUrl: 'https://polygon.technology', category: 'Web3 & Blockchain', order: 11 },
    { name: 'Zepto', tier: 'Quick Commerce Partner', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Zepto_Logo.png', websiteUrl: 'https://zeptonow.com', category: 'Retail & Delivery', order: 12 },
  ];

  for (const sp of sponsors) {
    const existing = await prisma.sponsor.findFirst({ where: { name: sp.name } });
    if (existing) {
      await prisma.sponsor.update({
        where: { id: existing.id },
        data: sp,
      });
    } else {
      await prisma.sponsor.create({
        data: sp,
      });
    }
  }
  console.log(`  ✓ Sponsors (${sponsors.length})`);

  // ── Alumni ────────────────────────────────────────────────────────────────
  const alumni = [
    {
      name: 'Gajendra Jangid',
      batch: "PEC '05",
      role: 'Co-Founder & CMO',
      company: 'CARS24',
      valuation: '$3.3B Unicorn',
      achievement: 'Forbes Global Entrepreneur',
      bio: 'Pioneered auto-tech logistics in India, scaling CARS24 from a seed idea to a multi-billion dollar international marketplace.',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      linkedin: 'https://linkedin.com/company/ecell-pec',
      order: 1,
    },
    {
      name: 'Padmasree Warrior',
      batch: "PEC '82",
      role: 'Founder & CEO, Fable',
      company: 'Ex-CTO Cisco & Motorola',
      valuation: 'Fortune Most Powerful Women',
      achievement: 'Microsoft & Spotify Board Member',
      bio: 'Global technology icon. Served as Chief Technology Officer at Cisco and Motorola, currently leading digital reading platform Fable.',
      imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
      linkedin: 'https://linkedin.com/company/ecell-pec',
      order: 2,
    },
    {
      name: 'Steve Sanghi',
      batch: "PEC '75",
      role: 'Executive Chairman',
      company: 'Microchip Technology',
      valuation: '$40B+ Nasdaq Giant',
      achievement: 'Semiconductor Executive of the Decade',
      bio: 'Transformed Microchip Technology from near-bankruptcy into a global semiconductor leader with 30+ consecutive years of profitability.',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
      linkedin: 'https://linkedin.com/company/ecell-pec',
      order: 3,
    },
    {
      name: 'Kunwar Sachdev',
      batch: "PEC '84",
      role: 'Founder & Innovator',
      company: 'Su-Kam Power Systems',
      valuation: 'Solar Man of India',
      achievement: 'Ernst & Young Entrepreneur of the Year',
      bio: 'Revolutionized power backup and solar renewable systems across South Asia, Africa, and the Middle East.',
      imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80',
      linkedin: 'https://linkedin.com/company/ecell-pec',
      order: 4,
    },
    {
      name: 'Dr. Ritesh Malik',
      batch: 'Mentor & Partner',
      role: 'Founder',
      company: 'Innov8 Coworking',
      valuation: 'Angel Investor in 80+ Startups',
      achievement: 'Forbes 30 Under 30 Asia',
      bio: 'Doctor turned serial entrepreneur and startup ecosystem builder. Scaled Innov8 to exit and actively mentors student founders across India.',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      linkedin: 'https://linkedin.com/company/ecell-pec',
      order: 5,
    },
    {
      name: 'Jaspal Bhatti',
      batch: "PEC '78",
      role: 'Satirist & Media Pioneer',
      company: 'Flop Show & Media Studio',
      valuation: 'Padma Bhushan Awardee',
      achievement: 'PEC Electrical Engineering Alum',
      bio: 'Legendary satirist, filmmaker, and cultural icon who pioneered independent broadcast television and creative media production in India.',
      imageUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=800&q=80',
      linkedin: 'https://linkedin.com/company/ecell-pec',
      order: 6,
    },
    {
      name: 'Prof. Vijay K. Dhir',
      batch: "PEC '65",
      role: 'Former Dean of Engineering',
      company: 'UCLA Samueli School',
      valuation: 'National Academy of Engineering',
      achievement: 'Distinguished Academic Leader',
      bio: 'Renowned researcher in thermal sciences and space shuttle heat-shield physics. Led UCLA Engineering to top-tier global research ranking.',
      imageUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=800&q=80',
      linkedin: 'https://linkedin.com/company/ecell-pec',
      order: 7,
    },
    {
      name: 'D.C. Anand',
      batch: "PEC '52",
      role: 'Founder & Chairman',
      company: 'ANAND Group India',
      valuation: 'Automotive Industry Titan',
      achievement: 'Pioneer of Auto Tier-1 in India',
      bio: 'Pioneered precision automotive component manufacturing in India, building a conglomerate of 19 companies partnering with global OEMs.',
      imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80',
      linkedin: 'https://linkedin.com/company/ecell-pec',
      order: 8,
    },
  ];

  for (const al of alumni) {
    const existing = await prisma.alumni.findFirst({ where: { name: al.name } });
    if (existing) {
      await prisma.alumni.update({
        where: { id: existing.id },
        data: al,
      });
    } else {
      await prisma.alumni.create({
        data: al,
      });
    }
  }
  console.log(`  ✓ Alumni (${alumni.length})`);

  // ── Gallery Items (16 slots) ──────────────────────────────────────────────
  const galleryItems = [
    { slot: 1, title: 'PEC Administrative Heritage Building', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412302/esummit/gallery/pec_admin_building.png' },
    { slot: 2, title: 'Centenary Hall & Lecture Arena', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412309/esummit/gallery/pec_centenary_hall.png' },
    { slot: 3, title: 'Historic MiG-21 Fighter Exhibit', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412324/esummit/gallery/pec_mig21.png' },
    { slot: 4, title: 'Campus Aerial Illumination at Night', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412303/esummit/gallery/pec_aerial_night.png' },
    { slot: 5, title: 'Main Auditorium (CCA) Facade', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412307/esummit/gallery/pec_auditorium_facade.png' },
    { slot: 6, title: 'IAF Mi-8 Helicopter Heritage Memorial', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412315/esummit/gallery/pec_iaf_helicopter.png' },
    { slot: 7, title: 'Startup Pitchers Live Deal Arena', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412326/esummit/gallery/pec_pitch.jpg' },
    { slot: 8, title: 'Organizing Committee & Leadership Team', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412336/esummit/gallery/pec_team.png' },
    { slot: 9, title: 'Summit Delegates & Student Gathering', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412313/esummit/gallery/pec_group.png' },
    { slot: 10, title: 'Auditorium Inauguration & Keynote Stage', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412306/esummit/gallery/pec_auditorium.png' },
    { slot: 11, title: 'Startup Exhibition & Career Expo', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412333/esummit/gallery/pec_startup_fair.png' },
    { slot: 12, title: 'Senate Hall Investor Roundtable', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412331/esummit/gallery/pec_senate_roundtable.png' },
    { slot: 13, title: 'Unicorn Founder Keynote Presentation', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412321/esummit/gallery/pec_keynote_speaker.png' },
    { slot: 14, title: 'Innovation Stage & Prototype Demos', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412317/esummit/gallery/pec_innovation_stage.png' },
    { slot: 15, title: 'Seed Pitch & Investor Evaluation', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412327/esummit/gallery/pec_pitch_table.png' },
    { slot: 16, title: 'Venture Capital Funding Conclave', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412311/esummit/gallery/pec_funding_conclave.png' },
  ];

  for (const item of galleryItems) {
    const existing = await prisma.galleryItem.findFirst({ where: { slot: item.slot } });
    if (existing) {
      await prisma.galleryItem.update({
        where: { id: existing.id },
        data: { title: item.title, imageUrl: item.imageUrl, mediaType: 'IMAGE' },
      });
    } else {
      await prisma.galleryItem.create({
        data: {
          slot: item.slot,
          title: item.title,
          imageUrl: item.imageUrl,
          mediaType: 'IMAGE',
        },
      });
    }
  }
  console.log(`  ✓ Gallery Items (${galleryItems.length} slots)`);

  // ── Portfolio Event Media (13 Activities) ──────────────────────────────────
  const portfolioEventMedia = [
    { eventId: 'corporate-workshops', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412327/esummit/gallery/pec_pitch_table.png' },
    { eventId: 'internship-job-fair', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412333/esummit/gallery/pec_startup_fair.png' },
    { eventId: 'rd-conclave', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412331/esummit/gallery/pec_senate_roundtable.png' },
    { eventId: 'ipl-auction', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412326/esummit/gallery/pec_pitch.jpg' },
    { eventId: 'ignite', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412317/esummit/gallery/pec_innovation_stage.png' },
    { eventId: 'treasure-hunt', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412323/esummit/gallery/pec_lawn_mosaic.png' },
    { eventId: 'baazar', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412313/esummit/gallery/pec_group.png' },
    { eventId: 'bizquiz-saasc', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412329/esummit/gallery/pec_senate_hall.png' },
    { eventId: 'additional-quiz-saasc', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412306/esummit/gallery/pec_auditorium.png' },
    { eventId: 'campus-ambassador', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412336/esummit/gallery/pec_team.png' },
    { eventId: 'expert-speakers', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412321/esummit/gallery/pec_keynote_speaker.png' },
    { eventId: 'funding-conclave', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412311/esummit/gallery/pec_funding_conclave.png' },
    { eventId: 'case-competition', imageUrl: 'https://res.cloudinary.com/dxtvq5s2x/image/upload/v1787412302/esummit/gallery/pec_admin_building.png' },
  ];

  for (const p of portfolioEventMedia) {
    await prisma.portfolioEventItem.upsert({
      where: { eventId: p.eventId },
      create: { eventId: p.eventId, imageUrl: p.imageUrl },
      update: { imageUrl: p.imageUrl },
    });
  }
  console.log(`  ✓ Portfolio Event Items (${portfolioEventMedia.length})`);

  // ── FAQs ──────────────────────────────────────────────────────────────────
  const faqs = [
    { question: 'Who can attend PEC E-Summit 2026?', answer: 'E-Summit is open to student founders, developers, creators, aspiring entrepreneurs, and industry professionals from across India.', category: 'General', order: 1 },
    { question: 'Are registration passes free?', answer: 'General Student Delegate Passes and Campus Ambassador Passes are 100% FREE. Specialized passes like Startup Founder & Hackathon passes have small entry fees for prize pools.', category: 'Passes', order: 2 },
    { question: 'How do I check in at the venue on March 15-16?', answer: 'Once you register, your digital E-Badge with a unique QR code is generated instantly. Show your digital badge on your phone at PEC gate entry for volunteer scanning.', category: 'Passes', order: 3 },
    { question: 'What are the cash prizes for competitions?', answer: 'The Pitchers Pitch competition features a total prize pool of ₹7.5 Lakhs in non-dilutive equity grants. The 24-Hour Hackathon features a prize pool of ₹5.0 Lakhs.', category: 'Pitch', order: 4 },
    { question: 'Are accommodation options available for outstation participants?', answer: 'Yes, subsidized hostel accommodation and campus guest house rooms are allocated on a first-come, first-served basis upon presentation of an active E-Summit registration pass.', category: 'General', order: 5 },
    { question: 'What is the Hackathon theme for 2026?', answer: 'The theme is revealed 48 hours before the Hackathon kickoff. Past themes have included "AI for Bharat", "Climate-First Products", and "Next Billion Users". Register early and keep an eye on our socials!', category: 'Hackathon', order: 6 },
  ];

  for (const faq of faqs) {
    const existing = await prisma.faq.findFirst({ where: { question: faq.question } });
    if (existing) {
      await prisma.faq.update({
        where: { id: existing.id },
        data: faq,
      });
    } else {
      await prisma.faq.create({
        data: faq,
      });
    }
  }
  console.log(`  ✓ FAQs (${faqs.length})`);

  // ── Schedule Items ────────────────────────────────────────────────────────
  const scheduleItems = [
    // Day 1
    { day: 1, date: 'MARCH 15, 2026', time: '09:00 AM', title: 'Registration & Welcome Kit', tag: 'Entry Gate', venueId: 'main-gate', venueName: 'Main Gate (Gate 1)', building: 'Campus Entrance - Gate 1', lat: 30.763153, lng: 76.783675, order: 1 },
    { day: 1, date: 'MARCH 15, 2026', time: '10:00 AM', title: 'Inaugural Ceremony & Keynote', tag: 'Main Stage', venueId: 'main-auditorium', venueName: 'Main Auditorium (CCA)', building: 'CCA Building', lat: 30.765515, lng: 76.784260, order: 2 },
    { day: 1, date: 'MARCH 15, 2026', time: '11:00 AM', title: 'Panel: Fundraising in a Tough Climate', tag: 'Senate Hall', venueId: 'senate', venueName: 'PEC Senate Hall', building: 'PEC Senate Hall', lat: 30.7670, lng: 76.7872, order: 3 },
    { day: 1, date: 'MARCH 15, 2026', time: '12:30 PM', title: 'Startup Expo Opens', tag: 'Expo Grounds', venueId: 'expo-hall', venueName: 'Expo Hall (SPIC Centre)', building: 'SPIC Centre', lat: 30.765833, lng: 76.785850, order: 4 },
    { day: 1, date: 'MARCH 15, 2026', time: '13:30 PM', title: 'Lunch Break & Networking', tag: 'Student Center', venueId: 'student-center', venueName: 'Student Center (PEC Market)', building: 'PEC Market Area', lat: 30.766326, lng: 76.783485, order: 5 },
    { day: 1, date: 'MARCH 15, 2026', time: '14:30 PM', title: 'Pitch Competition — Round 1', tag: 'Main Stage', venueId: 'main-auditorium', venueName: 'Main Auditorium (CCA)', building: 'CCA Building', lat: 30.765515, lng: 76.784260, order: 6 },
    { day: 1, date: 'MARCH 15, 2026', time: '17:30 PM', title: 'Hackathon Kickoff + Problem Reveal', tag: 'Hacker Lab', venueId: 'siemens_coe', venueName: 'Siemens Center of Excellence', building: 'Siemens Center of Excellence', lat: 30.7682, lng: 76.7890, order: 7 },
    { day: 1, date: 'MARCH 15, 2026', time: '19:00 PM', title: 'Speed Networking Session', tag: 'OAT Arena', venueId: 'oat', venueName: 'PEC Open Air Theatre', building: 'Open Air Theatre', lat: 30.7662, lng: 76.7875, order: 8 },
    // Day 2
    { day: 2, date: 'MARCH 16, 2026', time: '09:00 AM', title: 'Hackathon Mid-Check & Mentoring', tag: 'Hacker Lab', venueId: 'siemens_coe', venueName: 'Siemens Center of Excellence', building: 'Siemens Center of Excellence', lat: 30.7682, lng: 76.7890, order: 1 },
    { day: 2, date: 'MARCH 16, 2026', time: '10:00 AM', title: 'Panel: Student-to-Founder Playbook', tag: 'Senate Hall', venueId: 'senate', venueName: 'PEC Senate Hall', building: 'PEC Senate Hall', lat: 30.7670, lng: 76.7872, order: 2 },
    { day: 2, date: 'MARCH 16, 2026', time: '15:00 PM', title: 'Pitch Competition — Finals', tag: 'Main Stage', venueId: 'main-auditorium', venueName: 'Main Auditorium (CCA)', building: 'CCA Building', lat: 30.765515, lng: 76.784260, order: 3 },
    { day: 2, date: 'MARCH 16, 2026', time: '17:30 PM', title: 'Awards Ceremony & Prize Distribution', tag: 'Main Stage', venueId: 'main-auditorium', venueName: 'Main Auditorium (CCA)', building: 'CCA Building', lat: 30.765515, lng: 76.784260, order: 4 },
    { day: 2, date: 'MARCH 16, 2026', time: '18:30 PM', title: 'Closing Keynote', tag: 'Main Stage', venueId: 'main-auditorium', venueName: 'Main Auditorium (CCA)', building: 'CCA Building', lat: 30.765515, lng: 76.784260, order: 5 },
    { day: 2, date: 'MARCH 16, 2026', time: '19:30 PM', title: 'Closing Mixer & Farewells', tag: 'Student Center', venueId: 'student-center', venueName: 'Student Center (PEC Market)', building: 'PEC Market Area', lat: 30.766326, lng: 76.783485, order: 6 },
  ];

  for (const item of scheduleItems) {
    const existing = await prisma.scheduleItem.findFirst({
      where: { title: item.title, day: item.day },
    });
    if (existing) {
      await prisma.scheduleItem.update({
        where: { id: existing.id },
        data: item,
      });
    } else {
      await prisma.scheduleItem.create({
        data: item,
      });
    }
  }
  console.log(`  ✓ Schedule Items (${scheduleItems.length})`);

  console.log('\n✅ MongoDB database seeded successfully with all images, media, and CMS slots!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
