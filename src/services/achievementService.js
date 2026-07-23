import { db } from '../firebase';
import { 
  collection, doc, getDoc, getDocs, query, where, orderBy, limit, 
  serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { addDoc, setDoc, updateDoc, deleteDoc, runTransaction } from '../firebase';

// ── RARITY DEFINITIONS & THEME METADATA ───────────────────
export const RARITY_CONFIG = {
  common: {
    label: 'Common',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.3)',
    glow: '0 0 12px rgba(148, 163, 184, 0.2)'
  },
  uncommon: {
    label: 'Uncommon',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.3)',
    glow: '0 0 16px rgba(34, 197, 94, 0.25)'
  },
  rare: {
    label: 'Rare',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.35)',
    glow: '0 0 20px rgba(59, 130, 246, 0.3)'
  },
  epic: {
    label: 'Epic',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.4)',
    glow: '0 0 24px rgba(168, 85, 247, 0.35)'
  },
  legendary: {
    label: 'Legendary',
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.15))',
    border: 'rgba(245, 158, 11, 0.5)',
    glow: '0 0 28px rgba(245, 158, 11, 0.45)'
  },
  mythic: {
    label: 'Mythic',
    color: '#ef4444',
    bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(236, 72, 153, 0.2))',
    border: 'rgba(239, 68, 68, 0.6)',
    glow: '0 0 32px rgba(236, 72, 153, 0.5)'
  }
};

// ── DEFAULT MASTERY BADGES PRESETS ───────────────────────
export const SYSTEM_BADGES = [
  // ATTENDANCE
  {
    id: 'att_hero',
    title: 'Attendance Hero',
    category: 'Attendance',
    rarity: 'common',
    icon: '⚡',
    description: 'Maintain 90%+ attendance over 10 consecutive classes.',
    target: 10,
    unit: 'Classes',
    xpReward: 150,
    coinReward: 50,
    skills: ['Punctuality', 'Discipline']
  },
  {
    id: 'att_perfect',
    title: 'Perfect Attendance',
    category: 'Attendance',
    rarity: 'epic',
    icon: '👑',
    description: 'Achieve 100% attendance throughout the entire active month.',
    target: 30,
    unit: 'Days',
    xpReward: 500,
    coinReward: 200,
    skills: ['Consistency', 'Commitment']
  },
  {
    id: 'att_early_bird',
    title: 'Early Bird',
    category: 'Attendance',
    rarity: 'uncommon',
    icon: '🌅',
    description: 'Join morning sessions 10 minutes prior to scheduled start time.',
    target: 5,
    unit: 'Sessions',
    xpReward: 200,
    coinReward: 75,
    skills: ['Time Management']
  },

  // PROGRAMMING
  {
    id: 'prog_python_ninja',
    title: 'Python Ninja',
    category: 'Programming',
    rarity: 'rare',
    icon: '🐍',
    description: 'Master Python fundamentals, lists, loops, and Object Oriented Programming.',
    target: 50,
    unit: 'Exercises',
    xpReward: 400,
    coinReward: 150,
    skills: ['Python 3', 'OOP', 'Data Structures']
  },
  {
    id: 'prog_sql_master',
    title: 'SQL Master',
    category: 'Programming',
    rarity: 'epic',
    icon: '🗄️',
    description: 'Solve 100 complex SQL Joins, Aggregations, and Subqueries.',
    target: 100,
    unit: 'Queries',
    xpReward: 750,
    coinReward: 300,
    skills: ['SQL', 'Database Design', 'Query Optimization']
  },
  {
    id: 'prog_java_warrior',
    title: 'Java Warrior',
    category: 'Programming',
    rarity: 'rare',
    icon: '☕',
    description: 'Complete Java Collections, Multi-threading, and Exception Handling modules.',
    target: 40,
    unit: 'Programs',
    xpReward: 450,
    coinReward: 175,
    skills: ['Java Core', 'OOP', 'Threads']
  },
  {
    id: 'prog_web_builder',
    title: 'Web Builder',
    category: 'Programming',
    rarity: 'uncommon',
    icon: '🌐',
    description: 'Build 5 responsive web project templates using HTML, CSS, and JS.',
    target: 5,
    unit: 'Projects',
    xpReward: 300,
    coinReward: 100,
    skills: ['HTML5', 'CSS Flexbox', 'DOM Manipulation']
  },

  // PRODUCTIVITY
  {
    id: 'prod_daily_grinder',
    title: 'Daily Grinder',
    category: 'Productivity',
    rarity: 'common',
    icon: '🔥',
    description: 'Log in and complete at least 1 study task for 7 days in a row.',
    target: 7,
    unit: 'Days Streak',
    xpReward: 200,
    coinReward: 80,
    skills: ['Habit Formation']
  },
  {
    id: 'prod_100_streak',
    title: '100 Day Streak',
    category: 'Productivity',
    rarity: 'legendary',
    icon: '🌟',
    description: 'Unbroken 100-day daily learning streak across all subjects.',
    target: 100,
    unit: 'Days',
    xpReward: 2500,
    coinReward: 1000,
    skills: ['Unstoppable Drive', 'Excellence']
  },

  // ACADEMIC
  {
    id: 'acad_quiz_crusher',
    title: 'Quiz Crusher',
    category: 'Academic',
    rarity: 'rare',
    icon: '🎯',
    description: 'Score 90%+ in 15 timed subject quizzes.',
    target: 15,
    unit: 'Quizzes',
    xpReward: 350,
    coinReward: 120,
    skills: ['Precision', 'Subject Mastery']
  },
  {
    id: 'acad_perfect_score',
    title: 'Perfect Score',
    category: 'Academic',
    rarity: 'epic',
    icon: '💯',
    description: 'Achieve a 100% full mark on a major semester mock test.',
    target: 1,
    unit: 'Test',
    xpReward: 600,
    coinReward: 250,
    skills: ['Flawless Accuracy']
  },

  // SOFTWARE SKILLS
  {
    id: 'soft_excel_expert',
    title: 'Excel Expert',
    category: 'Software Skills',
    rarity: 'uncommon',
    icon: '📊',
    description: 'Master VLOOKUP, INDEX/MATCH, Pivot Tables, and Financial Modeling.',
    target: 25,
    unit: 'Spreadsheets',
    xpReward: 250,
    coinReward: 100,
    skills: ['MS Excel', 'Data Analysis']
  },
  {
    id: 'soft_tally_titan',
    title: 'Tally Titan',
    category: 'Software Skills',
    rarity: 'rare',
    icon: '💼',
    description: 'Complete GST Vouchers, Ledger Accounts, and Balance Sheets in Tally Prime.',
    target: 30,
    unit: 'Vouchers',
    xpReward: 400,
    coinReward: 160,
    skills: ['Tally Prime', 'Accounting']
  },

  // COMMUNITY
  {
    id: 'comm_helping_hand',
    title: 'Helping Hand',
    category: 'Community',
    rarity: 'uncommon',
    icon: '🤝',
    description: 'Answer 10 classmate doubt queries in the student discussion workspace.',
    target: 10,
    unit: 'Answers',
    xpReward: 300,
    coinReward: 110,
    skills: ['Peer Mentorship', 'Teamwork']
  },
  {
    id: 'comm_faculty_favorite',
    title: 'Faculty Favorite',
    category: 'Community',
    rarity: 'legendary',
    icon: '🎖️',
    description: 'Receive an official faculty commendation badge from your mentor.',
    target: 1,
    unit: 'Award',
    xpReward: 1000,
    coinReward: 500,
    skills: ['Academic Leadership']
  },

  // HIDDEN (SECRET)
  {
    id: 'secret_night_owl',
    title: 'Night Owl',
    category: 'Hidden',
    rarity: 'rare',
    icon: '🦉',
    description: 'Unlocked by completing a learning module after midnight.',
    target: 1,
    unit: 'Midnight Session',
    xpReward: 300,
    coinReward: 100,
    skills: ['Dedication']
  },
  {
    id: 'secret_comeback_kid',
    title: 'Comeback Kid',
    category: 'Hidden',
    rarity: 'epic',
    icon: '🦅',
    description: 'Scored 95%+ on a test immediately following a score below 60%.',
    target: 1,
    unit: 'Comeback',
    xpReward: 600,
    coinReward: 250,
    skills: ['Resilience']
  }
];

// ── SYSTEM STORE REDEMPTION ITEMS ─────────────────────────
export const CAMPUS_STORE_ITEMS = [
  {
    id: 'item_theme_dark_gold',
    title: 'Gold Cyber Theme',
    category: 'Theme',
    price: 350,
    icon: '✨',
    description: 'Unlock exclusive Gold & Cyber Slate UI color accent for your dashboard.'
  },
  {
    id: 'item_frame_champion',
    title: 'Champion Avatar Frame',
    category: 'Frame',
    price: 250,
    icon: '🖼️',
    description: 'Glowing animated gold frame around your student avatar across leaderboards.'
  },
  {
    id: 'item_notes_sql_mastery',
    title: 'Advanced SQL Cheat Sheet',
    category: 'Notes',
    price: 150,
    icon: '📘',
    description: 'Curated 2026 Interview Questions and Query Optimization PDF guide.'
  },
  {
    id: 'item_mock_test_pass',
    title: 'TCS NQT Mock Pass',
    category: 'Pass',
    price: 500,
    icon: '🎫',
    description: 'Full-length placement diagnostic test with AI feedback and scorecard.'
  }
];

/**
 * Fetch all available system achievements from Firestore (or fallback defaults).
 */
export const getAllAchievements = async () => {
  try {
    const ref = collection(db, 'achievements');
    const snap = await getDocs(ref);
    if (!snap.empty) {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      return list;
    }
    return SYSTEM_BADGES;
  } catch (err) {
    console.error('[achievementService] getAllAchievements error:', err);
    return SYSTEM_BADGES;
  }
};

/**
 * Subscribe to real-time achievements progress for a specific student.
 */
export const subscribeUserAchievements = (userId, callback) => {
  if (!userId) {
    callback([]);
    return () => {};
  }
  try {
    const q = collection(db, 'users', userId, 'studentAchievements');
    return onSnapshot(q, (snap) => {
      const userBadgeMap = {};
      snap.forEach(d => {
        userBadgeMap[d.id] = { id: d.id, ...d.data() };
      });

      // Merge system badges with user progress
      const merged = SYSTEM_BADGES.map(b => {
        const userProgress = userBadgeMap[b.id] || {};
        const currentProgress = userProgress.progress || 0;
        const isUnlocked = userProgress.isUnlocked || false;
        const percent = Math.min(100, Math.round((currentProgress / b.target) * 100));

        return {
          ...b,
          progress: currentProgress,
          isUnlocked,
          percent,
          unlockedAt: userProgress.unlockedAt || null,
          facultyNote: userProgress.facultyNote || null
        };
      });

      callback(merged);
    }, (err) => {
      console.error('[achievementService] subscribeUserAchievements error:', err);
      // Fallback
      callback(SYSTEM_BADGES.map(b => ({ ...b, progress: 0, isUnlocked: false, percent: 0 })));
    });
  } catch (err) {
    console.error('[achievementService] listener setup error:', err);
    callback([]);
    return () => {};
  }
};

/**
 * Returns dynamic Daily Missions for a user.
 */
export const getDailyMissions = async (userId) => {
  const todayKey = new Date().toISOString().split('T')[0];
  const missionsKey = `missions_${userId}_${todayKey}`;

  const defaultMissions = [
    {
      id: `m1_${todayKey}`,
      title: 'Complete Today\'s Chapter',
      desc: 'Finish 1 chapter in Python or Web Dev',
      xp: 50,
      coins: 20,
      icon: '📖',
      completed: false
    },
    {
      id: `m2_${todayKey}`,
      title: 'Solve 15 Practice MCQs',
      desc: 'Practice 15 questions in Tests section',
      xp: 75,
      coins: 30,
      icon: '⚡',
      completed: false
    },
    {
      id: `m3_${todayKey}`,
      title: 'Maintain Today\'s Attendance',
      desc: 'Mark attendance or attend live session',
      xp: 40,
      coins: 15,
      icon: '📅',
      completed: false
    },
    {
      id: `m4_${todayKey}`,
      title: 'Revise Yesterday\'s Topic',
      desc: 'Read notes for 10 minutes',
      xp: 60,
      coins: 25,
      icon: '🧠',
      completed: false
    }
  ];

  try {
    const saved = localStorage.getItem(missionsKey);
    if (saved) {
      return JSON.parse(saved);
    }
    localStorage.setItem(missionsKey, JSON.stringify(defaultMissions));
    return defaultMissions;
  } catch (err) {
    return defaultMissions;
  }
};

/**
 * Claim Daily Mission reward.
 */
export const claimMissionReward = async (userId, missionId) => {
  const todayKey = new Date().toISOString().split('T')[0];
  const missionsKey = `missions_${userId}_${todayKey}`;

  try {
    const raw = localStorage.getItem(missionsKey);
    if (!raw) return null;

    const missions = JSON.parse(raw);
    const targetIdx = missions.findIndex(m => m.id === missionId);
    if (targetIdx === -1 || missions[targetIdx].completed) return null;

    const mission = missions[targetIdx];
    missions[targetIdx].completed = true;
    localStorage.setItem(missionsKey, JSON.stringify(missions));

    // Update user XP & Campus Coins in Firestore
    if (userId) {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const currentXP = data.xp || 0;
        const currentCoins = data.campusCoins || 0;
        const currentLevel = data.level || 1;

        const newXP = currentXP + mission.xp;
        const newCoins = currentCoins + mission.coins;
        const newLevel = Math.floor(newXP / 500) + 1; // 500 XP per level

        await updateDoc(userRef, {
          xp: newXP,
          campusCoins: newCoins,
          level: newLevel,
          updatedAt: serverTimestamp()
        });

        // Record transaction
        const txRef = collection(db, 'users', userId, 'transactions');
        await addDoc(txRef, {
          title: `Mission Completed: ${mission.title}`,
          coins: mission.coins,
          xp: mission.xp,
          type: 'earn',
          createdAt: serverTimestamp()
        });
      }
    }

    return mission;
  } catch (err) {
    console.error('[achievementService] claimMissionReward error:', err);
    return null;
  }
};

/**
 * Calculate 100-Level Academic Pass progress.
 */
export const getAcademicPassProgress = (totalXP = 0) => {
  const XP_PER_LEVEL = 300; // 300 XP per level up to 100
  const currentLevel = Math.min(100, Math.floor(totalXP / XP_PER_LEVEL) + 1);
  const currentLevelXP = totalXP % XP_PER_LEVEL;
  const levelPercent = Math.min(100, Math.round((currentLevelXP / XP_PER_LEVEL) * 100));

  // Generate 100 levels rewards roadmap
  const rewardsRoadmap = Array.from({ length: 100 }, (_, idx) => {
    const lvl = idx + 1;
    let rewardType = 'Campus Coins';
    let rewardTitle = `${lvl * 50} Campus Coins`;
    let icon = '🪙';

    if (lvl % 10 === 0) {
      rewardType = 'Certificate & Badge';
      rewardTitle = `Level ${lvl} Academic Mastery Certificate`;
      icon = '📜';
    } else if (lvl % 5 === 0) {
      rewardType = 'Profile Frame / Theme';
      rewardTitle = `Level ${lvl} Exclusive Avatar Frame`;
      icon = '🖼️';
    } else if (lvl % 3 === 0) {
      rewardType = 'Premium Notes';
      rewardTitle = `Subject Interview Questions PDF`;
      icon = '📘';
    }

    return {
      level: lvl,
      rewardType,
      rewardTitle,
      icon,
      isUnlocked: lvl <= currentLevel
    };
  });

  return {
    currentLevel,
    currentLevelXP,
    xpPerLevel: XP_PER_LEVEL,
    levelPercent,
    rewardsRoadmap
  };
};

/**
 * Purchase item from Campus Store.
 */
export const purchaseStoreItem = async (userId, item) => {
  if (!userId || !item) return { success: false, error: 'Invalid parameters' };

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { success: false, error: 'User record not found' };

    const data = userSnap.data();
    const currentCoins = data.campusCoins || 0;

    if (currentCoins < item.price) {
      return { success: false, error: `Insufficient Campus Coins. You need ${item.price - currentCoins} more coins.` };
    }

    const newCoins = currentCoins - item.price;
    const inventory = data.inventory || [];

    if (inventory.some(inv => inv.id === item.id)) {
      return { success: false, error: 'Item already in inventory' };
    }

    await updateDoc(userRef, {
      campusCoins: newCoins,
      inventory: [...inventory, { id: item.id, title: item.title, category: item.category, redeemedAt: new Date().toISOString() }]
    });

    // Record transaction
    const txRef = collection(db, 'users', userId, 'transactions');
    await addDoc(txRef, {
      title: `Redeemed Store Item: ${item.title}`,
      coins: -item.price,
      type: 'spent',
      createdAt: serverTimestamp()
    });

    return { success: true, remainingCoins: newCoins };
  } catch (err) {
    console.error('[achievementService] purchaseStoreItem error:', err);
    return { success: false, error: err.message };
  }
};
