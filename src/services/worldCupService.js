import { db } from '../firebase';
import { 
  collection, doc, getDoc, getDocs, query, where, orderBy, limit, 
  serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { addDoc, setDoc, updateDoc, deleteDoc, runTransaction } from '../firebase';

// List of Greek suffixes for squad scaling
const GREEK_SUFFIXES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 
  'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'
];

/**
 * Returns a squad suffix based on index (e.g. index 0 -> Alpha, index 24 -> Alpha 2)
 */
const getSquadSuffix = (index) => {
  const baseIndex = index % GREEK_SUFFIXES.length;
  const loopCount = Math.floor(index / GREEK_SUFFIXES.length);
  const suffix = GREEK_SUFFIXES[baseIndex];
  return loopCount > 0 ? `${suffix} ${loopCount + 1}` : suffix;
};

/**
 * Ensures there is an active World Cup season in Firestore. 
 * If none exists, it creates a default active season document.
 */
export const getActiveSeason = async () => {
  try {
    const seasonsRef = collection(db, 'worldcup_seasons');
    const q = query(seasonsRef, where('status', '==', 'active'), limit(1));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
    
    // Self-seeding: Create active season if none exists
    const defaultSeason = {
      name: 'World Cup Summer 2026',
      status: 'active',
      createdAt: new Date(),
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
    const newDocRef = await addDoc(seasonsRef, defaultSeason);
    return { id: newDocRef.id, ...defaultSeason };
  } catch (err) {
    console.error('[worldCupService] getActiveSeason error:', err);
    // Fallback season object
    return { id: 'season_2026_default', name: 'World Cup 2026 Fallback', status: 'active' };
  }
};

/**
 * Joins a student to a national team using First-Come, First-Served squad scaling.
 * Maximum 4 players per squad.
 */
export const joinWorldCupTeam = async (userId, username, teamId) => {
  try {
    console.log("[worldCupService] Starting join flow for:", teamId, "User:", userId);
    const activeSeason = await getActiveSeason();
    const seasonId = activeSeason.id;
    
    const groupsRef = collection(db, 'worldcup_groups');
    
    // 1. Query existing squads for this team and season (non-transactional read)
    const q = query(
      groupsRef, 
      where('teamId', '==', teamId), 
      where('seasonId', '==', seasonId)
    );
    const snap = await getDocs(q);
    const squadDocsList = [];
    snap.forEach(d => {
      squadDocsList.push({ id: d.id, ref: d.ref, ...d.data() });
    });
    
    // 2. Start transaction for safe state checks and updates
    const transactionResult = await runTransaction(db, async (transaction) => {
      let targetSquad = null;
      
      // Sort squadDocsList by oldest created first
      const sortedSquads = squadDocsList.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateA - dateB;
      });

      for (const sq of sortedSquads) {
        // Read squad document inside the transaction to get real-time state
        const squadSnap = await transaction.get(sq.ref);
        if (squadSnap.exists()) {
          const data = squadSnap.data();
          if (data.members && data.members.length < 4) {
            targetSquad = { id: squadSnap.id, ref: squadSnap.ref, ...data };
            break; // Found a valid squad with space!
          }
        }
      }
      
      const userRef = doc(db, 'users', userId);
      const userUpdateData = {
        chosenTeam: teamId,
        worldcupSeason: seasonId,
        joinedAt: new Date().toISOString()
      };
      
      if (targetSquad) {
        // Join existing squad
        const updatedMembers = [...targetSquad.members, {
          uid: userId,
          username: username,
          score: 0,
          goals: 0,
          joinedAt: new Date().toISOString()
        }];
        
        transaction.update(targetSquad.ref, {
          members: updatedMembers,
          memberUids: updatedMembers.map(m => m.uid)
        });
        
        userUpdateData.worldcupGroupId = targetSquad.id;
        userUpdateData.squadId = targetSquad.id;
        
        transaction.update(userRef, userUpdateData);
        
        return { groupId: targetSquad.id, squadName: targetSquad.name };
      } else {
        // Create new squad
        const squadIndex = squadDocsList.length;
        const squadSuffix = getSquadSuffix(squadIndex);
        const squadName = `${teamId} Squad ${squadSuffix}`;
        
        const newSquadRef = doc(collection(db, 'worldcup_groups'));
        const newSquad = {
          name: squadName,
          teamId,
          seasonId,
          captain: userId,
          captainName: username,
          createdAt: new Date(),
          members: [{
            uid: userId,
            username: username,
            score: 0,
            goals: 0,
            joinedAt: new Date().toISOString()
          }],
          memberUids: [userId],
          totalGoals: 0,
          totalScore: 0
        };
        
        transaction.set(newSquadRef, newSquad);
        
        userUpdateData.worldcupGroupId = newSquadRef.id;
        userUpdateData.squadId = newSquadRef.id;
        
        transaction.update(userRef, userUpdateData);
        
        return { groupId: newSquadRef.id, squadName };
      }
    });
    
    console.log("[worldCupService] Join flow succeeded with result:", transactionResult);
    return transactionResult;
  } catch (err) {
    console.error('[worldCupService] joinWorldCupTeam error:', err);
    throw err;
  }
};

/**
 * Removes a student from their current World Cup squad.
 * If squad is empty, deletes the squad document.
 * If user was captain, re-calculates new captain based on highest score.
 */
export const leaveWorldCupTeam = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    
    const userData = userSnap.data();
    const groupId = userData.worldcupGroupId;
    if (!groupId) return;
    
    const squadRef = doc(db, 'worldcup_groups', groupId);
    const squadSnap = await getDoc(squadRef);
    
    if (squadSnap.exists()) {
      const squadData = squadSnap.data();
      const currentMembers = squadData.members || [];
      const updatedMembers = currentMembers.filter(m => m.uid !== userId);
      
      if (updatedMembers.length === 0) {
        // Delete empty squad
        await deleteDoc(squadRef);
      } else {
        // Calculate new captain if leaving user was the captain
        let newCaptainId = squadData.captain;
        let newCaptainName = squadData.captainName;
        
        if (squadData.captain === userId) {
          const sorted = [...updatedMembers].sort((a, b) => (b.score || 0) - (a.score || 0));
          newCaptainId = sorted[0].uid;
          newCaptainName = sorted[0].username;
        }
        
        // Recalculate totals
        const totalScore = updatedMembers.reduce((sum, m) => sum + (m.score || 0), 0);
        const totalGoals = updatedMembers.reduce((sum, m) => sum + (m.goals || 0), 0);
        
        await updateDoc(squadRef, {
          members: updatedMembers,
          memberUids: updatedMembers.map(m => m.uid),
          captain: newCaptainId,
          captainName: newCaptainName,
          totalScore,
          totalGoals
        });
      }
    }
    
    // Clear WC fields from user doc
    await updateDoc(userRef, {
      chosenTeam: null,
      worldcupGroupId: null,
      worldcupSeason: null
    });
  } catch (err) {
    console.error('[worldCupService] leaveWorldCupTeam error:', err);
    throw err;
  }
};

/**
 * Subscribes to a private squad chat.
 */
export const subscribeTeamChat = (groupId, callback) => {
  try {
    const chatRef = collection(db, 'worldcup_chat');
    const q = query(
      chatRef,
      where('groupId', '==', groupId),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    
    return onSnapshot(q, (snap) => {
      const messages = [];
      snap.forEach(docSnap => {
        messages.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(messages);
    });
  } catch (err) {
    console.error('[worldCupService] subscribeTeamChat error:', err);
    return () => {};
  }
};

/**
 * Sends a message in the private squad chat.
 */
export const sendTeamChatMessage = async (groupId, userId, username, text) => {
  try {
    const chatRef = collection(db, 'worldcup_chat');
    await addDoc(chatRef, {
      groupId,
      userId,
      username,
      text,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('[worldCupService] sendTeamChatMessage error:', err);
    throw err;
  }
};

/**
 * Saves a daily match attempt score/goals. 
 * Updates squad members score, checks/updates captain promotion.
 */
export const saveMatchAttempt = async (userId, groupId, goals, accuracy) => {
  try {
    const scoreVal = Math.round(goals * (accuracy / 100) * 10);
    
    // Log match score entry
    const scoresRef = collection(db, 'worldcup_scores');
    await addDoc(scoresRef, {
      userId,
      groupId,
      goals,
      accuracy,
      score: scoreVal,
      timestamp: serverTimestamp()
    });
    
    // Update squad document members and dynamic captain
    const squadRef = doc(db, 'worldcup_groups', groupId);
    const squadSnap = await getDoc(squadRef);
    
    if (squadSnap.exists()) {
      const squadData = squadSnap.data();
      const members = squadData.members || [];
      
      const updatedMembers = members.map(m => {
        if (m.uid === userId) {
          return {
            ...m,
            score: (m.score || 0) + scoreVal,
            goals: (m.goals || 0) + goals
          };
        }
        return m;
      });
      
      // Dynamic Captain Selection: Highest score of current members
      const sortedByScore = [...updatedMembers].sort((a, b) => (b.score || 0) - (a.score || 0));
      const highestScoringMember = sortedByScore[0];
      
      const totalScore = updatedMembers.reduce((sum, m) => sum + (m.score || 0), 0);
      const totalGoals = updatedMembers.reduce((sum, m) => sum + (m.goals || 0), 0);
      
      await updateDoc(squadRef, {
        members: updatedMembers,
        captain: highestScoringMember.uid,
        captainName: highestScoringMember.username,
        totalScore,
        totalGoals
      });
      
      return {
        scoreVal,
        isNewCaptain: highestScoringMember.uid === userId && squadData.captain !== userId
      };
    }
    
    return { scoreVal, isNewCaptain: false };
  } catch (err) {
    console.error('[worldCupService] saveMatchAttempt error:', err);
    throw err;
  }
};

/**
 * Retrieves standings data for Leaderboard tabs.
 */
export const getStandings = async (seasonId) => {
  try {
    const groupsRef = collection(db, 'worldcup_groups');
    const q = query(groupsRef, where('seasonId', '==', seasonId));
    const snap = await getDocs(q);
    
    const squads = [];
    snap.forEach(docSnap => {
      squads.push({ id: docSnap.id, ...docSnap.data() });
    });
    
    // Squads sorted by totalScore DESC
    const squadStandings = [...squads].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    
    // Countries aggregated goals & scores
    const countryAggregates = {};
    squads.forEach(sq => {
      if (!countryAggregates[sq.teamId]) {
        countryAggregates[sq.teamId] = {
          name: sq.teamId,
          totalScore: 0,
          totalGoals: 0,
          squadCount: 0
        };
      }
      countryAggregates[sq.teamId].totalScore += (sq.totalScore || 0);
      countryAggregates[sq.teamId].totalGoals += (sq.totalGoals || 0);
      countryAggregates[sq.teamId].squadCount += 1;
    });
    
    const countryStandings = Object.values(countryAggregates)
      .sort((a, b) => b.totalScore - a.totalScore);
      
    return {
      squadStandings,
      countryStandings
    };
  } catch (err) {
    console.error('[worldCupService] getStandings error:', err);
    return { squadStandings: [], countryStandings: [] };
  }
};
