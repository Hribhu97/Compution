import { db } from '../firebase';
import { 
  collection, doc, getDoc, setDoc, updateDoc, addDoc, onSnapshot, 
  query, where, orderBy, limit, serverTimestamp, increment, runTransaction 
} from 'firebase/firestore';

/* ─── HOUSES CONFIGURATION ─────────────────────────────────────────── */
export const HOUSES = {
  gryffindor: {
    id: 'gryffindor',
    name: 'Gryffindor',
    animal: 'Lion',
    emoji: '🦁',
    logo: '/house-logos/gryffindor.png',
    motto: 'Fortitude in Knowledge',
    traits: ['Bravery', 'Courage', 'Chivalry', 'Confidence'],
    primaryColor: '#DC2626',
    secondaryColor: '#F59E0B',
    bgGradient: 'linear-gradient(135deg, #7F1D1D 0%, #450A0A 100%)',
    badgeColor: '#EF4444',
    bannerImg: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80'
  },
  ravenclaw: {
    id: 'ravenclaw',
    name: 'Ravenclaw',
    animal: 'Eagle',
    emoji: '🦅',
    logo: '/house-logos/ravenclaw.png',
    motto: 'Wisdom Beyond Measure',
    traits: ['Wisdom', 'Curiosity', 'Creativity', 'Intelligence'],
    primaryColor: '#2563EB',
    secondaryColor: '#94A3B8',
    bgGradient: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
    badgeColor: '#3B82F6',
    bannerImg: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80'
  },
  slytherin: {
    id: 'slytherin',
    name: 'Slytherin',
    animal: 'Serpent',
    emoji: '🐍',
    logo: '/house-logos/slytherin.png',
    motto: 'Ambition Drives Excellence',
    traits: ['Ambition', 'Leadership', 'Strategy', 'Resourcefulness'],
    primaryColor: '#16A34A',
    secondaryColor: '#94A3B8',
    bgGradient: 'linear-gradient(135deg, #14532D 0%, #052E16 100%)',
    badgeColor: '#22C55E',
    bannerImg: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80'
  },
  hufflepuff: {
    id: 'hufflepuff',
    name: 'Hufflepuff',
    animal: 'Badger',
    emoji: '🦡',
    logo: '/house-logos/hufflepuff.png',
    motto: 'Diligence & Loyalty',
    traits: ['Loyalty', 'Fairness', 'Patience', 'Hard Work'],
    primaryColor: '#EAB308',
    secondaryColor: '#1E293B',
    bgGradient: 'linear-gradient(135deg, #713F12 0%, #1E293B 100%)',
    badgeColor: '#F59E0B',
    bannerImg: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80'
  }
};

export const HOUSE_RESULT_MESSAGES = {
  gryffindor: "You enjoy stepping forward when others hesitate. You are willing to face challenges and encourage people around you. Your courage and determination make you a natural fit for Gryffindor.",
  ravenclaw: "You are driven by curiosity and a deep desire to learn. You look at problems analytically and seek creative solutions. Your wisdom and thoughtful mindset make you a natural fit for Ravenclaw.",
  hufflepuff: "You value kindness, loyalty, and working together. You bring people together and ensure everyone is cared for. Your patience and dedication make you a natural fit for Hufflepuff.",
  slytherin: "You are ambitious, strategic, and focused on excellence. You know how to set big goals and lead effectively to reach them. Your determination and leadership make you a natural fit for Slytherin."
};

/* ─── 15 SCENARIO-BASED SORTING CEREMONY v2 QUESTIONS ─────────────── */
export const SORTING_CEREMONY_V2_QUESTIONS = [
  {
    id: 1,
    scenario: "Your teacher suddenly asks for a volunteer to present first.",
    options: [
      { id: 'A', text: 'I stand up immediately.', target: 'gryffindor' },
      { id: 'B', text: 'I ask if I can prepare for one minute first.', target: 'ravenclaw' },
      { id: 'C', text: 'I encourage someone who is nervous to join me.', target: 'hufflepuff' },
      { id: 'D', text: 'I volunteer because I want to make the best impression.', target: 'slytherin' }
    ]
  },
  {
    id: 2,
    scenario: "You find ₹500 on the classroom floor.",
    options: [
      { id: 'A', text: 'I loudly ask whose money it is.', target: 'gryffindor' },
      { id: 'B', text: 'I think about the best way to find the owner.', target: 'ravenclaw' },
      { id: 'C', text: 'I hand it to the teacher immediately.', target: 'hufflepuff' },
      { id: 'D', text: 'I make sure the right person gets it before anyone else claims it.', target: 'slytherin' }
    ]
  },
  {
    id: 3,
    scenario: "Your group has only one day left to finish a project.",
    options: [
      { id: 'A', text: 'I motivate everyone to start immediately.', target: 'gryffindor' },
      { id: 'B', text: 'I create a proper plan first.', target: 'ravenclaw' },
      { id: 'C', text: 'I help anyone who is falling behind.', target: 'hufflepuff' },
      { id: 'D', text: 'I assign tasks so we finish as quickly as possible.', target: 'slytherin' }
    ]
  },
  {
    id: 4,
    scenario: "A difficult puzzle is placed in front of you.",
    options: [
      { id: 'A', text: 'I keep trying until I solve it.', target: 'gryffindor' },
      { id: 'B', text: 'I study the clues carefully.', target: 'ravenclaw' },
      { id: 'C', text: 'I solve it together with friends.', target: 'hufflepuff' },
      { id: 'D', text: 'I look for the smartest shortcut.', target: 'slytherin' }
    ]
  },
  {
    id: 5,
    scenario: "A new student joins your class.",
    options: [
      { id: 'A', text: 'I introduce myself first.', target: 'gryffindor' },
      { id: 'B', text: 'I ask about their interests.', target: 'ravenclaw' },
      { id: 'C', text: 'I invite them to sit with me.', target: 'hufflepuff' },
      { id: 'D', text: 'I find out what skills they have.', target: 'slytherin' }
    ]
  },
  {
    id: 6,
    scenario: "You can learn only one new skill this month.",
    options: [
      { id: 'A', text: 'Public speaking', target: 'gryffindor' },
      { id: 'B', text: 'Artificial Intelligence', target: 'ravenclaw' },
      { id: 'C', text: 'Communication', target: 'hufflepuff' },
      { id: 'D', text: 'Leadership', target: 'slytherin' }
    ]
  },
  {
    id: 7,
    scenario: "Your friend loses confidence before an exam.",
    options: [
      { id: 'A', text: 'I remind them they can do it.', target: 'gryffindor' },
      { id: 'B', text: 'I explain difficult topics again.', target: 'ravenclaw' },
      { id: 'C', text: 'I stay with them until they feel better.', target: 'hufflepuff' },
      { id: 'D', text: 'I help them focus on scoring maximum marks.', target: 'slytherin' }
    ]
  },
  {
    id: 8,
    scenario: "Your class wins a competition.",
    options: [
      { id: 'A', text: "I celebrate everyone's hard work.", target: 'gryffindor' },
      { id: 'B', text: 'I think about what made us successful.', target: 'ravenclaw' },
      { id: 'C', text: 'I thank every teammate.', target: 'hufflepuff' },
      { id: 'D', text: 'I immediately think about winning the next one.', target: 'slytherin' }
    ]
  },
  {
    id: 9,
    scenario: "You have one free hour.",
    options: [
      { id: 'A', text: 'Try something exciting.', target: 'gryffindor' },
      { id: 'B', text: 'Read or learn something new.', target: 'ravenclaw' },
      { id: 'C', text: 'Spend time with friends.', target: 'hufflepuff' },
      { id: 'D', text: 'Work on a personal goal.', target: 'slytherin' }
    ]
  },
  {
    id: 10,
    scenario: "A competition begins tomorrow.",
    options: [
      { id: 'A', text: 'I am excited to participate.', target: 'gryffindor' },
      { id: 'B', text: 'I prepare carefully.', target: 'ravenclaw' },
      { id: 'C', text: 'I make sure my team is ready.', target: 'hufflepuff' },
      { id: 'D', text: 'I plan how to win.', target: 'slytherin' }
    ]
  },
  {
    id: 11,
    scenario: "If your class could remember you for one thing, what would you want it to be?",
    options: [
      { id: 'A', text: 'My courage.', target: 'gryffindor' },
      { id: 'B', text: 'My ideas.', target: 'ravenclaw' },
      { id: 'C', text: 'My kindness.', target: 'hufflepuff' },
      { id: 'D', text: 'My achievements.', target: 'slytherin' }
    ]
  },
  {
    id: 12,
    scenario: "You are given the chance to organize a school event.",
    options: [
      { id: 'A', text: 'Lead everyone from the front.', target: 'gryffindor' },
      { id: 'B', text: 'Design creative activities.', target: 'ravenclaw' },
      { id: 'C', text: 'Make sure everyone enjoys it.', target: 'hufflepuff' },
      { id: 'D', text: 'Make it the best event the school has ever had.', target: 'slytherin' }
    ]
  },
  {
    id: 13,
    scenario: "You notice someone being left out during lunch.",
    options: [
      { id: 'A', text: 'Invite them to join.', target: 'gryffindor' },
      { id: 'B', text: 'Start a conversation with them.', target: 'ravenclaw' },
      { id: 'C', text: 'Sit beside them.', target: 'hufflepuff' },
      { id: 'D', text: 'Introduce them to the whole group.', target: 'slytherin' }
    ]
  },
  {
    id: 14,
    scenario: "You receive unexpected free time after school.",
    options: [
      { id: 'A', text: 'Play a sport or try something adventurous.', target: 'gryffindor' },
      { id: 'B', text: 'Build or learn something interesting.', target: 'ravenclaw' },
      { id: 'C', text: 'Help someone at home.', target: 'hufflepuff' },
      { id: 'D', text: 'Work toward a personal dream.', target: 'slytherin' }
    ]
  },
  {
    id: 15,
    scenario: "Imagine you are starting your own journey. What matters most?",
    options: [
      { id: 'A', text: 'Facing challenges without fear.', target: 'gryffindor' },
      { id: 'B', text: 'Never stop learning.', target: 'ravenclaw' },
      { id: 'C', text: 'Growing together with others.', target: 'hufflepuff' },
      { id: 'D', text: 'Reaching my biggest goals.', target: 'slytherin' }
    ]
  }
];

/* ─── DETERMINISTIC HOUSE MATCHING v2 ALGORITHM ────────────────────── */
export const calculateHouseRecommendation = (answersMap) => {
  const scores = { gryffindor: 0, ravenclaw: 0, hufflepuff: 0, slytherin: 0 };
  const lastFiveWeighted = { gryffindor: 0, ravenclaw: 0, hufflepuff: 0, slytherin: 0 };
  const earliestOccurrence = { gryffindor: 99, ravenclaw: 99, hufflepuff: 99, slytherin: 99 };

  SORTING_CEREMONY_V2_QUESTIONS.forEach(q => {
    const selectedHouse = answersMap[q.id];
    if (selectedHouse && scores.hasOwnProperty(selectedHouse)) {
      scores[selectedHouse] += 1;
      
      if (q.id < earliestOccurrence[selectedHouse]) {
        earliestOccurrence[selectedHouse] = q.id;
      }

      if (q.id >= 11) {
        lastFiveWeighted[selectedHouse] += 1.5;
      }
    }
  });

  let maxScore = -1;
  Object.values(scores).forEach(val => {
    if (val > maxScore) maxScore = val;
  });

  const tiedHouses = Object.keys(scores).filter(h => scores[h] === maxScore);

  if (tiedHouses.length === 1) {
    return tiedHouses[0];
  }

  // Tie-breaker 1: Weight of last 5 questions
  let maxWeighted = -1;
  tiedHouses.forEach(h => {
    if (lastFiveWeighted[h] > maxWeighted) maxWeighted = lastFiveWeighted[h];
  });
  const weightedTied = tiedHouses.filter(h => lastFiveWeighted[h] === maxWeighted);

  if (weightedTied.length === 1) {
    return weightedTied[0];
  }

  // Tie-breaker 2: Earliest answer selection among tied houses
  let winner = weightedTied[0];
  let minQId = earliestOccurrence[winner];

  weightedTied.forEach(h => {
    if (earliestOccurrence[h] < minQId) {
      minQId = earliestOccurrence[h];
      winner = h;
    }
  });

  return winner;
};

/* ─── ASSIGN HOUSE TO STUDENT ──────────────────────────────────────── */
export const assignUserHouse = async (userId, houseId, isManualChoice = false) => {
  if (!HOUSES[houseId]) throw new Error('Invalid House specified');
  const userRef = doc(db, 'users', userId);
  
  const now = new Date();
  const nextSwitchAllowed = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days cooldown

  // 1. Update Student User Doc (Always succeeds for authenticated student)
  await updateDoc(userRef, {
    house: houseId,
    houseAssigned: true,
    houseAssignedAt: serverTimestamp(),
    houseSwitchCooldownUntil: nextSwitchAllowed.toISOString(),
    updatedAt: serverTimestamp()
  });

  // 2. Update Global House Aggregation (Safely handle Firestore permissions)
  try {
    const houseRef = doc(db, 'houses', houseId);
    await setDoc(houseRef, {
      id: houseId,
      name: HOUSES[houseId].name,
      totalPoints: increment(50),
      memberCount: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("Global house aggregate update skipped due to rules:", err);
  }

  // 3. Log Activity (Safely handle Firestore permissions)
  try {
    await logHouseActivity(userId, houseId, 'Joined House', 50);
  } catch (err) {
    console.warn("House activity log skipped due to rules:", err);
  }
};

/* ─── SWITCH HOUSE (WITH 30-DAY COOLDOWN ENFORCEMENT) ──────────────── */
export const switchUserHouse = async (user, newHouseId, isAdminOverride = false) => {
  if (!HOUSES[newHouseId]) throw new Error('Invalid House');
  
  if (!isAdminOverride && user.houseSwitchCooldownUntil) {
    const cooldownDate = new Date(user.houseSwitchCooldownUntil);
    if (new Date() < cooldownDate) {
      const daysLeft = Math.ceil((cooldownDate - new Date()) / (1000 * 60 * 60 * 24));
      throw new Error(`House switch cooldown active. You can switch houses again in ${daysLeft} days.`);
    }
  }

  const oldHouseId = user.house;
  const userRef = doc(db, 'users', user.uid);
  const now = new Date();
  const nextSwitchAllowed = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 1. Update Student User Doc
  await updateDoc(userRef, {
    house: newHouseId,
    houseAssigned: true,
    houseSwitchCooldownUntil: nextSwitchAllowed.toISOString(),
    updatedAt: serverTimestamp()
  });

  // 2. Decrement old / Increment new global house member counts
  try {
    if (oldHouseId) {
      const oldHouseRef = doc(db, 'houses', oldHouseId);
      await setDoc(oldHouseRef, { memberCount: increment(-1) }, { merge: true });
    }
    const newHouseRef = doc(db, 'houses', newHouseId);
    await setDoc(newHouseRef, { memberCount: increment(1) }, { merge: true });
  } catch (err) {
    console.warn("Global house member count sync skipped due to rules:", err);
  }

  // 3. Log Activity
  try {
    await logHouseActivity(user.uid, newHouseId, 'Transferred to House', 10);
  } catch (err) {
    console.warn("House activity log skipped due to rules:", err);
  }
};

/* ─── LOG HOUSE ACTIVITY & AWARD POINTS ────────────────────────────── */
export const logHouseActivity = async (userId, houseId, activityName, points) => {
  if (!houseId) return;

  try {
    const activityRef = collection(db, 'houseActivities');
    await addDoc(activityRef, {
      userId,
      houseId,
      activityName,
      points,
      createdAt: serverTimestamp()
    });

    const houseRef = doc(db, 'houses', houseId);
    await setDoc(houseRef, {
      totalPoints: increment(points),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("logHouseActivity permissions warning:", err);
  }
};

/* ─── REALTIME LISTENERS ───────────────────────────────────────────── */

// 1. Subscribe House Details & Standings
export const subscribeAllHouses = (callback) => {
  const q = query(collection(db, 'houses'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (err) => {
    console.warn("House collection subscription warning:", err);
  });
};

// 2. Subscribe Teammates Roster (Strictly excludes email/phone for student privacy)
export const subscribeHouseTeammates = (houseId, callback) => {
  if (!houseId) return () => {};
  const q = query(collection(db, 'users'), where('house', '==', houseId), limit(50));
  return onSnapshot(q, (snapshot) => {
    const members = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        displayName: data.displayName || data.name || 'House Member',
        photoURL: data.photoURL || '',
        class: data.class || 'Student',
        course: data.course || 'Compution Learner',
        houseLevel: data.houseLevel || Math.floor((data.xp || 0) / 250) + 1,
        housePoints: data.housePoints || data.xp || 0,
        streak: data.streak || 1,
        role: data.houseRole || (data.role === 'admin' ? 'House Admin' : 'Member'),
        onlineStatus: data.isActive !== false ? 'Online' : 'Offline'
      };
    });
    callback(members);
  }, (err) => {
    console.warn("Teammates subscription warning:", err);
  });
};

// 3. Subscribe House Chat Feed
export const subscribeHouseFeed = (houseId, callback) => {
  if (!houseId) return () => {};
  const q = query(
    collection(db, 'houseFeed'), 
    where('houseId', '==', houseId), 
    orderBy('createdAt', 'desc'), 
    limit(40)
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })).reverse();
    callback(messages);
  }, (err) => {
    console.warn("House feed subscription warning:", err);
  });
};

// 4. Post Message to House Feed
export const postHouseFeedMessage = async (houseId, user, text, isPinned = false) => {
  if (!houseId || !text.trim()) return;
  try {
    const feedRef = collection(db, 'houseFeed');
    await addDoc(feedRef, {
      houseId,
      userId: user.uid,
      userName: user.displayName || user.name || 'Member',
      userPhoto: user.photoURL || '',
      userRole: user.role || 'student',
      text: text.trim(),
      isPinned: Boolean(isPinned),
      reactions: {},
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("postHouseFeedMessage permission warning:", err);
  }
};

// 5. Subscribe House Prefect Competitions
export const subscribePrefectCompetitions = (houseId, callback) => {
  const q = query(
    collection(db, 'houseCompetitions'),
    where('houseId', 'in', [houseId, 'all']),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  return onSnapshot(q, (snapshot) => {
    const competitions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(competitions);
  }, (err) => {
    console.warn("Prefect competition subscription warning:", err);
  });
};

// 6. Admin Create Competition
export const createPrefectCompetition = async (adminUser, compData) => {
  const compRef = collection(db, 'houseCompetitions');
  await addDoc(compRef, {
    title: compData.title,
    houseId: compData.houseId || 'all',
    subject: compData.subject || 'General Academic',
    durationMins: Number(compData.durationMins) || 20,
    passingScore: Number(compData.passingScore) || 80,
    status: compData.status || 'Active', // 'Draft', 'Active', 'Completed'
    questions: compData.questions || [],
    createdBy: adminUser.uid,
    createdByName: adminUser.displayName || 'Admin',
    createdAt: serverTimestamp()
  });
};

// 7. Admin Declare House Prefect
export const declareHousePrefect = async (adminUser, competitionId, houseId, winnerStudent) => {
  // Update competition status
  const compRef = doc(db, 'houseCompetitions', competitionId);
  await updateDoc(compRef, {
    status: 'Completed',
    winnerStudentId: winnerStudent.uid,
    winnerStudentName: winnerStudent.displayName || winnerStudent.name,
    declaredAt: serverTimestamp()
  });

  // Award Prefect Role & Gold Badge to Student
  const studentRef = doc(db, 'users', winnerStudent.uid);
  await setDoc(studentRef, {
    isHousePrefect: true,
    houseRole: 'House Prefect',
    houseBadges: increment(1),
    badgesList: [{
      id: 'badge_house_prefect',
      title: 'House Prefect',
      icon: '👑',
      badgeType: 'gold_prefect',
      awardedAt: new Date().toISOString()
    }]
  }, { merge: true });

  // Update House Spotlight
  const houseRef = doc(db, 'houses', houseId);
  await setDoc(houseRef, {
    currentPrefectId: winnerStudent.uid,
    currentPrefectName: winnerStudent.displayName || winnerStudent.name,
    currentPrefectPhoto: winnerStudent.photoURL || '',
    updatedAt: serverTimestamp()
  }, { merge: true });

  // Post Announcement to House Feed
  await postHouseFeedMessage(
    houseId, 
    adminUser, 
    `🏆 OFFICIAL ANNOUNCEMENT: ${winnerStudent.displayName || winnerStudent.name} has been appointed as the House Prefect!`, 
    true
  );
};

// 8. Subscribe House Activities
export const subscribeHouseActivities = (houseId, callback) => {
  if (!houseId) return () => {};
  const q = query(
    collection(db, 'houseActivities'),
    where('houseId', '==', houseId),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(activities);
  }, (err) => {
    console.warn("House activities subscription warning:", err);
    callback([]);
  });
};
