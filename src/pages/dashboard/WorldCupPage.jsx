import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../firebase';
import { 
 collection, query, doc, where, getDoc, getDocs, 
 onSnapshot, orderBy, limit 
} from 'firebase/firestore';
import { 
 leaveWorldCupTeam, 
 sendTeamChatMessage, 
 saveMatchAttempt, 
 getStandings, 
 getActiveSeason
} from '../../services/worldCupService';
import TeamSelection from '../../components/garden/TeamSelection';
import { 
 Trophy, MessageSquare, Send, Users, Award, 
 Play, Shield, Star, LogOut, Check, X, Volume2, VolumeX, ArrowLeft, Share2, Clock
} from 'lucide-react';

const TEAM_THEMES = {
 Argentina: { primary: '#74ACDF', secondary: '#FFFFFF', gradient: 'linear-gradient(135deg, #1e3a8a, #74ACDF)', confetti: ['#74ACDF', '#FFFFFF'], flag: '' },
 Brazil: { primary: '#FEDF00', secondary: '#009739', gradient: 'linear-gradient(135deg, #115e59, #009739)', confetti: ['#FEDF00', '#009739'], flag: '' },
 France: { primary: '#002395', secondary: '#FFFFFF', gradient: 'linear-gradient(135deg, #0f172a, #002395)', confetti: ['#002395', '#FFFFFF', '#ED2939'], flag: '' },
 England: { primary: '#FFFFFF', secondary: '#C8102E', gradient: 'linear-gradient(135deg, #1f2937, #C8102E)', confetti: ['#FFFFFF', '#C8102E'], flag: '' },
 Germany: { primary: '#FFFFFF', secondary: '#000000', gradient: 'linear-gradient(135deg, #111827, #000000)', confetti: ['#000000', '#FF0000', '#FFCC00'], flag: '' },
 Spain: { primary: '#C60B1E', secondary: '#FFD700', gradient: 'linear-gradient(135deg, #7c1a22, #FFD700)', confetti: ['#C60B1E', '#FFD700'], flag: '' },
 Portugal: { primary: '#C1272D', secondary: '#046A38', gradient: 'linear-gradient(135deg, #581c22, #046A38)', confetti: ['#C1272D', '#046A38'], flag: '' },
 Italy: { primary: '#002F6C', secondary: '#FFFFFF', gradient: 'linear-gradient(135deg, #0f172a, #002F6C)', confetti: ['#002F6C', '#FFFFFF', '#008C45'], flag: '' },
 Netherlands: { primary: '#F85B00', secondary: '#FFFFFF', gradient: 'linear-gradient(135deg, #7c2d12, #F85B00)', confetti: ['#F85B00', '#FFFFFF'], flag: '' },
 Belgium: { primary: '#E30613', secondary: '#FFE936', gradient: 'linear-gradient(135deg, #7c1a22, #FFE936)', confetti: ['#E30613', '#FFE936', '#000000'], flag: '' },
 Croatia: { primary: '#E30613', secondary: '#FFFFFF', gradient: 'linear-gradient(135deg, #7c1a22, #FFFFFF)', confetti: ['#E30613', '#FFFFFF'], flag: '' },
 Uruguay: { primary: '#55B355', secondary: '#FFFFFF', gradient: 'linear-gradient(135deg, #166534, #55B355)', confetti: ['#55B355', '#FFFFFF'], flag: '' },
 Japan: { primary: '#0000FF', secondary: '#FFFFFF', gradient: 'linear-gradient(135deg, #1e3a8a, #0000FF)', confetti: ['#0000FF', '#FFFFFF', '#BC002D'], flag: '' },
 Senegal: { primary: '#FFFFFF', secondary: '#00853F', gradient: 'linear-gradient(135deg, #166534, #00853F)', confetti: ['#00853F', '#FFE936', '#E30613'], flag: '' },
 Morocco: { primary: '#C1272D', secondary: '#006233', gradient: 'linear-gradient(135deg, #7c1a22, #006233)', confetti: ['#C1272D', '#006233'], flag: '' },
 USA: { primary: '#FFFFFF', secondary: '#3C3B6E', gradient: 'linear-gradient(135deg, #1f2937, #3C3B6E)', confetti: ['#FFFFFF', '#3C3B6E', '#C8102E'], flag: '' }
};

const LEGENDS = {
 Argentina: ['Diego Maradona', 'Lionel Messi', 'Gabriel Batistuta', 'Mario Kempes'],
 Brazil: ['PelÃ©', 'Ronaldo NazÃ¡rio', 'Ronaldinho', 'Neymar Jr'],
 France: ['Zinedine Zidane', 'Michel Platini', 'Kylian MbappÃ©', 'Thierry Henry'],
 England: ['Bobby Charlton', 'David Beckham', 'Harry Kane', 'Bobby Moore'],
 Germany: ['Franz Beckenbauer', 'Gerd MÃ¼ller', 'Jamal Musiala', 'Miroslav Klose'],
 Spain: ['AndrÃ©s Iniesta', 'Xavi HernÃ¡ndez', 'Iker Casillas', 'RaÃºl'],
 Portugal: ['EusÃ©bio', 'LuÃ­s Figo', 'Cristiano Ronaldo', 'Rui Costa'],
 Italy: ['Roberto Baggio', 'Andrea Pirlo', 'Francesco Totti', 'Gianluigi Buffon'],
 Netherlands: ['Johan Cruyff', 'Marco van Basten', 'Virgil van Dijk', 'Ruud Gullit'],
 Belgium: ['Kevin De Bruyne', 'Eden Hazard', 'Romelu Lukaku', 'Jan Ceulemans'],
 Croatia: ['Luka ModriÄ‡', 'Davor Å uker', 'Ivan RakitiÄ‡', 'Zvonimir Boban'],
 Uruguay: ['Luis SuÃ¡rez', 'Diego ForlÃ¡n', 'Federico Valverde', 'Obdulio Varela'],
 Japan: ['Hidetoshi Nakata', 'Keisuke Honda', 'Wataru Endo', 'Shunsuke Nakamura'],
 Senegal: ['Sadio ManÃ©', 'El Hadji Diouf', 'Kalidou Koulibaly', 'Aliou CissÃ©'],
 Morocco: ['Mustapha Hadji', 'Achraf Hakimi', 'Yassine Bounou', 'Noureddine Naybet'],
 USA: ['Landon Donovan', 'Christian Pulisic', 'Clint Dempsey', 'Brian McBride']
};

const TEAM_DETAILS = {
 Argentina: {
 iso: 'AR',
 isoLabel: 'ARGENTINA',
 primary: '#74ACDF',
 secondary: '#FFFFFF',
 textAccent: '#74ACDF',
 buttonGradient: 'linear-gradient(90deg, #74ACDF 0%, #1e3a8a 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#74ACDF',
 jerseyStripes: true,
 jerseyNumber: '10',
 jerseyAccentColor: '#FFFFFF',
 overlayColor: 'rgba(15,27,63,0.72)',
 accentLine: '#74ACDF',
 squadAlphaColor: '#74ACDF',
 legends: [
 { name: 'Lionel\nMessi', nickname: '', initials: 'LM', bg: '#1a2e5c' },
 { name: 'Diego\nMaradona', nickname: '', initials: 'DM', bg: '#1e3a8a' },
 { name: 'Gabriel\nBatistuta', nickname: '', initials: 'GB', bg: '#152955' },
 { name: 'Ãngel\nDi Maria', nickname: '', initials: 'AD', bg: '#1a3570' }
 ]
 },
 Brazil: {
 iso: 'BR',
 isoLabel: 'BRASIL',
 primary: '#FEDF00',
 secondary: '#009739',
 textAccent: '#FEDF00',
 buttonGradient: 'linear-gradient(90deg, #009739 0%, #007a30 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#FEDF00',
 jerseyStripes: false,
 jerseyNumber: '10',
 jerseyAccentColor: '#009739',
 overlayColor: 'rgba(5,26,15,0.65)',
 accentLine: '#FEDF00',
 squadAlphaColor: '#FEDF00',
 legends: [
 { name: 'PelÃ©', nickname: 'The King', initials: 'P', bg: '#1a4a28' },
 { name: 'Ronaldo\nNazÃ¡rio', nickname: 'O FenÃ´meno', initials: 'RN', bg: '#1a4a28' },
 { name: 'Ronaldinho', nickname: 'The Magician', initials: 'R', bg: '#1a4a28' },
 { name: 'Neymar Jr', nickname: 'The Star', initials: 'NJ', bg: '#1a4a28' }
 ]
 },
 France: {
 iso: 'FR',
 isoLabel: 'FRANCE',
 primary: '#6699CC',
 secondary: '#ED2939',
 textAccent: '#ffffff',
 buttonGradient: 'linear-gradient(90deg, #002395 0%, #ED2939 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#002395',
 jerseyStripes: false,
 jerseyNumber: '10',
 jerseyAccentColor: '#ffffff',
 overlayColor: 'rgba(5,10,35,0.72)',
 accentLine: '#ED2939',
 squadAlphaColor: '#60A5FA',
 legends: [
 { name: 'Zinedine\nZidane', nickname: 'Zizou', initials: 'ZZ', bg: '#0a1a40' },
 { name: 'Thierry\nHenry', nickname: 'The Icon', initials: 'TH', bg: '#0a1a40' },
 { name: 'Kylian\nMbappÃ©', nickname: 'The Future', initials: 'KM', bg: '#0a1a40' },
 { name: 'Antoine\nGriezmann', nickname: 'The Maestro', initials: 'AG', bg: '#0a1a40' }
 ]
 },
 England: {
 iso: 'EN',
 isoLabel: 'ENGLAND',
 primary: '#C8102E',
 secondary: '#FFFFFF',
 textAccent: '#ffffff',
 buttonGradient: 'linear-gradient(90deg, #C8102E 0%, #a00d25 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#FFFFFF',
 jerseyStripes: false,
 jerseyNumber: '9',
 jerseyAccentColor: '#C8102E',
 overlayColor: 'rgba(10,5,15,0.72)',
 accentLine: '#C8102E',
 squadAlphaColor: '#C8102E',
 legends: [
 { name: 'Bobby\nMoore', nickname: 'The Captain', initials: 'BM', bg: '#2a0a12' },
 { name: 'David\nBeckham', nickname: 'The Icon', initials: 'DB', bg: '#2a0a12' },
 { name: 'Wayne\nRooney', nickname: 'The Leader', initials: 'WR', bg: '#2a0a12' },
 { name: 'Harry\nKane', nickname: 'The Finisher', initials: 'HK', bg: '#2a0a12' }
 ]
 },
 Germany: {
 iso: 'DE',
 isoLabel: 'GERMANY',
 primary: '#FEDF00',
 secondary: '#000000',
 textAccent: '#FEDF00',
 buttonGradient: 'linear-gradient(90deg, #C8102E 0%, #FEDF00 100%)',
 buttonTextColor: '#000000',
 jerseyBg: '#FFFFFF',
 jerseyStripes: false,
 jerseyNumber: '10',
 jerseyAccentColor: '#000000',
 overlayColor: 'rgba(8,6,5,0.72)',
 accentLine: '#FEDF00',
 squadAlphaColor: '#FEDF00',
 legends: [
 { name: 'Franz\nBeckenbauer', nickname: 'The Emperor', initials: 'FB', bg: '#1a1a1a' },
 { name: 'Miroslav\nKlose', nickname: 'The Record Breaker', initials: 'MK', bg: '#1a1a1a' },
 { name: 'Bastian\nSchweinsteiger', nickname: 'The Engine', initials: 'BS', bg: '#1a1a1a' },
 { name: 'Thomas\nMÃ¼ller', nickname: 'The Raumdeuter', initials: 'TM', bg: '#1a1a1a' }
 ]
 },
 Portugal: {
 iso: 'PT',
 isoLabel: 'PORTUGAL',
 primary: '#FEDF00',
 secondary: '#046A38',
 textAccent: '#FEDF00',
 buttonGradient: 'linear-gradient(90deg, #C1272D 0%, #046A38 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#C1272D',
 jerseyStripes: false,
 jerseyNumber: '7',
 jerseyAccentColor: '#046A38',
 overlayColor: 'rgba(30,5,8,0.72)',
 accentLine: '#FEDF00',
 squadAlphaColor: '#FEDF00',
 legends: [
 { name: 'EusÃ©bio', nickname: 'The Black Panther', initials: 'E', bg: '#2a0a0a' },
 { name: 'LuÃ­s Figo', nickname: 'The Wizard', initials: 'LF', bg: '#2a0a0a' },
 { name: 'C. Ronaldo', nickname: 'CR7', initials: 'CR', bg: '#2a0a0a' },
 { name: 'Rui Costa', nickname: 'The Maestro', initials: 'RC', bg: '#2a0a0a' }
 ]
 },
 Spain: {
 iso: 'ES',
 isoLabel: 'SPAIN',
 primary: '#FFD700',
 secondary: '#C60B1E',
 textAccent: '#FFD700',
 buttonGradient: 'linear-gradient(90deg, #C60B1E 0%, #FFD700 100%)',
 buttonTextColor: '#000000',
 jerseyBg: '#C60B1E',
 jerseyStripes: false,
 jerseyNumber: '6',
 jerseyAccentColor: '#FFD700',
 overlayColor: 'rgba(30,5,8,0.72)',
 accentLine: '#FFD700',
 squadAlphaColor: '#FFD700',
 legends: [
 { name: 'AndrÃ©s\nIniesta', nickname: 'The Maestro', initials: 'AI', bg: '#2a0a12' },
 { name: 'Xavi\nHernÃ¡ndez', nickname: 'The Architect', initials: 'XH', bg: '#2a0a12' },
 { name: 'Iker\nCasillas', nickname: 'Saint Iker', initials: 'IC', bg: '#2a0a12' },
 { name: 'RaÃºl\nGonzÃ¡lez', nickname: 'El CapitÃ¡n', initials: 'RG', bg: '#2a0a12' }
 ]
 },
 Italy: {
 iso: 'IT',
 isoLabel: 'ITALIA',
 primary: '#60A5FA',
 secondary: '#FFFFFF',
 textAccent: '#60A5FA',
 buttonGradient: 'linear-gradient(90deg, #002F6C 0%, #1a5fa0 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#002F6C',
 jerseyStripes: false,
 jerseyNumber: '10',
 jerseyAccentColor: '#FFFFFF',
 overlayColor: 'rgba(5,10,35,0.72)',
 accentLine: '#60A5FA',
 squadAlphaColor: '#60A5FA',
 legends: [
 { name: 'Roberto\nBaggio', nickname: 'The Divine Ponytail', initials: 'RB', bg: '#0a1a40' },
 { name: 'Andrea\nPirlo', nickname: 'The Maestro', initials: 'AP', bg: '#0a1a40' },
 { name: 'Francesco\nTotti', nickname: 'Il Capitano', initials: 'FT', bg: '#0a1a40' },
 { name: 'G. Buffon', nickname: 'The Wall', initials: 'GB', bg: '#0a1a40' }
 ]
 },
 Netherlands: {
 iso: 'NL',
 isoLabel: 'NETHERLANDS',
 primary: '#F85B00',
 secondary: '#FFFFFF',
 textAccent: '#F85B00',
 buttonGradient: 'linear-gradient(90deg, #7c2d12 0%, #F85B00 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#F85B00',
 jerseyStripes: false,
 jerseyNumber: '14',
 jerseyAccentColor: '#FFFFFF',
 overlayColor: 'rgba(30,10,5,0.72)',
 accentLine: '#F85B00',
 squadAlphaColor: '#F85B00',
 legends: [
 { name: 'Johan\nCruyff', nickname: 'The Flying Dutchman', initials: 'JC', bg: '#2a1206' },
 { name: 'M. van\nBasten', nickname: 'The Goal Machine', initials: 'MB', bg: '#2a1206' },
 { name: 'Virgil\nvan Dijk', nickname: 'The Rock', initials: 'VD', bg: '#2a1206' },
 { name: 'Ruud\nGullit', nickname: 'The Messiah', initials: 'RG', bg: '#2a1206' }
 ]
 },
 Belgium: {
 iso: 'BE',
 isoLabel: 'BELGIUM',
 primary: '#FFE936',
 secondary: '#E30613',
 textAccent: '#FFE936',
 buttonGradient: 'linear-gradient(90deg, #E30613 0%, #FFE936 100%)',
 buttonTextColor: '#000000',
 jerseyBg: '#E30613',
 jerseyStripes: false,
 jerseyNumber: '7',
 jerseyAccentColor: '#FFE936',
 overlayColor: 'rgba(30,5,5,0.72)',
 accentLine: '#FFE936',
 squadAlphaColor: '#FFE936',
 legends: [
 { name: 'K. De\nBruyne', nickname: 'The Engine', initials: 'KD', bg: '#2a0a0a' },
 { name: 'Eden\nHazard', nickname: 'The Magician', initials: 'EH', bg: '#2a0a0a' },
 { name: 'Romelu\nLukaku', nickname: 'Big Rom', initials: 'RL', bg: '#2a0a0a' },
 { name: 'V. Kompany', nickname: 'The Captain', initials: 'VK', bg: '#2a0a0a' }
 ]
 },
 Croatia: {
 iso: 'HR',
 isoLabel: 'CROATIA',
 primary: '#E30613',
 secondary: '#FFFFFF',
 textAccent: '#E30613',
 buttonGradient: 'linear-gradient(90deg, #7c1a22 0%, #E30613 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#E30613',
 jerseyStripes: true,
 jerseyNumber: '10',
 jerseyAccentColor: '#FFFFFF',
 overlayColor: 'rgba(30,5,8,0.72)',
 accentLine: '#E30613',
 squadAlphaColor: '#E30613',
 legends: [
 { name: 'Luka\nModriÄ‡', nickname: 'The General', initials: 'LM', bg: '#2a0a0a' },
 { name: 'Davor\nÅ uker', nickname: 'The Sharpshooter', initials: 'DS', bg: '#2a0a0a' },
 { name: 'Ivan\nRakitiÄ‡', nickname: 'The Playmaker', initials: 'IR', bg: '#2a0a0a' },
 { name: 'Zvonimir\nBoban', nickname: 'The Legend', initials: 'ZB', bg: '#2a0a0a' }
 ]
 },
 Uruguay: {
 iso: 'UY',
 isoLabel: 'URUGUAY',
 primary: '#55B355',
 secondary: '#FFFFFF',
 textAccent: '#55B355',
 buttonGradient: 'linear-gradient(90deg, #166534 0%, #55B355 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#55B355',
 jerseyStripes: false,
 jerseyNumber: '9',
 jerseyAccentColor: '#FFFFFF',
 overlayColor: 'rgba(5,20,10,0.72)',
 accentLine: '#55B355',
 squadAlphaColor: '#55B355',
 legends: [
 { name: 'Luis\nSuÃ¡rez', nickname: 'El Pistolero', initials: 'LS', bg: '#0a2a14' },
 { name: 'Diego\nForlÃ¡n', nickname: 'The Star', initials: 'DF', bg: '#0a2a14' },
 { name: 'F. Valverde', nickname: 'El Pajarito', initials: 'FV', bg: '#0a2a14' },
 { name: 'Obdulio\nVarela', nickname: 'El Jefe', initials: 'OV', bg: '#0a2a14' }
 ]
 },
 Japan: {
 iso: 'JP',
 isoLabel: 'JAPAN',
 primary: '#60A5FA',
 secondary: '#FFFFFF',
 textAccent: '#60A5FA',
 buttonGradient: 'linear-gradient(90deg, #1e3a8a 0%, #0000CC 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#0000FF',
 jerseyStripes: false,
 jerseyNumber: '10',
 jerseyAccentColor: '#FFFFFF',
 overlayColor: 'rgba(5,5,30,0.72)',
 accentLine: '#60A5FA',
 squadAlphaColor: '#60A5FA',
 legends: [
 { name: 'H. Nakata', nickname: 'The Pioneer', initials: 'HN', bg: '#0a1a40' },
 { name: 'Keisuke\nHonda', nickname: 'The Leader', initials: 'KH', bg: '#0a1a40' },
 { name: 'Wataru\nEndo', nickname: 'The Shield', initials: 'WE', bg: '#0a1a40' },
 { name: 'S. Nakamura', nickname: 'The Magician', initials: 'SN', bg: '#0a1a40' }
 ]
 },
 Senegal: {
 iso: 'SN',
 isoLabel: 'SENEGAL',
 primary: '#00853F',
 secondary: '#FFFFFF',
 textAccent: '#00853F',
 buttonGradient: 'linear-gradient(90deg, #166534 0%, #00853F 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#FFFFFF',
 jerseyStripes: false,
 jerseyNumber: '10',
 jerseyAccentColor: '#00853F',
 overlayColor: 'rgba(5,20,10,0.72)',
 accentLine: '#00853F',
 squadAlphaColor: '#00853F',
 legends: [
 { name: 'Sadio\nManÃ©', nickname: 'The Lion', initials: 'SM', bg: '#0a2a14' },
 { name: 'El Hadji\nDiouf', nickname: 'The Wizard', initials: 'ED', bg: '#0a2a14' },
 { name: 'K. Koulibaly', nickname: 'The Wall', initials: 'KK', bg: '#0a2a14' },
 { name: 'Aliou\nCissÃ©', nickname: 'The General', initials: 'AC', bg: '#0a2a14' }
 ]
 },
 Morocco: {
 iso: 'MA',
 isoLabel: 'MOROCCO',
 primary: '#FEDF00',
 secondary: '#C1272D',
 textAccent: '#FEDF00',
 buttonGradient: 'linear-gradient(90deg, #C1272D 0%, #006233 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#C1272D',
 jerseyStripes: false,
 jerseyNumber: '2',
 jerseyAccentColor: '#006233',
 overlayColor: 'rgba(30,5,5,0.72)',
 accentLine: '#FEDF00',
 squadAlphaColor: '#FEDF00',
 legends: [
 { name: 'Mustapha\nHadji', nickname: 'The Pioneer', initials: 'MH', bg: '#2a0a0a' },
 { name: 'Achraf\nHakimi', nickname: 'The Jet', initials: 'AH', bg: '#2a0a0a' },
 { name: 'Yassine\nBounou', nickname: 'The Wall', initials: 'YB', bg: '#2a0a0a' },
 { name: 'N. Naybet', nickname: 'The Rock', initials: 'NN', bg: '#2a0a0a' }
 ]
 },
 USA: {
 iso: 'US',
 isoLabel: 'USA',
 primary: '#60A5FA',
 secondary: '#FFFFFF',
 textAccent: '#60A5FA',
 buttonGradient: 'linear-gradient(90deg, #B22234 0%, #3C3B6E 100%)',
 buttonTextColor: '#ffffff',
 jerseyBg: '#FFFFFF',
 jerseyStripes: true,
 jerseyNumber: '10',
 jerseyAccentColor: '#3C3B6E',
 overlayColor: 'rgba(10,10,30,0.72)',
 accentLine: '#60A5FA',
 squadAlphaColor: '#60A5FA',
 legends: [
 { name: 'Landon\nDonovan', nickname: 'The Legend', initials: 'LD', bg: '#0a0a2a' },
 { name: 'C. Pulisic', nickname: 'Captain America', initials: 'CP', bg: '#0a0a2a' },
 { name: 'Clint\nDempsey', nickname: 'Deuce', initials: 'CD', bg: '#0a0a2a' },
 { name: 'Tim\nHoward', nickname: 'The Secretary', initials: 'TH', bg: '#0a0a2a' }
 ]
 }
};

const RenderJerseySVG = ({ primaryColor, secondaryColor, stripes, number = '10' }) => {
 return (
 <svg width="70" height="70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}>
 {/* Sleeves */}
 <path d="M10 32 L30 18 L38 32 L18 45 Z" fill={secondaryColor} />
 <path d="M90 32 L70 18 L62 32 L82 45 Z" fill={secondaryColor} />
 
 {/* Main Body */}
 <path d="M30 18 L70 18 L75 80 L25 80 Z" fill={primaryColor} />
 
 {/* Stripes if active */}
 {stripes && (
 <>
 <rect x="36" y="18" width="6" height="62" fill={secondaryColor} />
 <rect x="48" y="18" width="6" height="62" fill={secondaryColor} />
 <rect x="60" y="18" width="6" height="62" fill={secondaryColor} />
 </>
 )}
 
 {/* Collar */}
 <path d="M40 18 Q50 28 60 18 Z" fill={secondaryColor} />
 
 {/* Number on shirt */}
 <text x="50" y="55" fill={secondaryColor} fontSize="22" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">{number}</text>
 </svg>
 );
};

const playSoundEffect = (type, isMuted) => {
 if (isMuted) return;
 try {
 const ctx = new (window.AudioContext || window.webkitAudioContext)();
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();
 osc.connect(gain);
 gain.connect(ctx.destination);
 
 if (type === 'goal') {
 osc.type = 'triangle';
 osc.frequency.setValueAtTime(150, ctx.currentTime);
 osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 1.2);
 gain.gain.setValueAtTime(0.25, ctx.currentTime);
 gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
 osc.start();
 osc.stop(ctx.currentTime + 1.2);
 } else if (type === 'save') {
 osc.type = 'sawtooth';
 osc.frequency.setValueAtTime(250, ctx.currentTime);
 osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 1.0);
 gain.gain.setValueAtTime(0.2, ctx.currentTime);
 gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
 osc.start();
 osc.stop(ctx.currentTime + 1.0);
 } else if (type === 'whistle') {
 osc.type = 'sine';
 osc.frequency.setValueAtTime(1000, ctx.currentTime);
 osc.frequency.setValueAtTime(800, ctx.currentTime + 0.15);
 osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.3);
 gain.gain.setValueAtTime(0.15, ctx.currentTime);
 gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
 osc.start();
 osc.stop(ctx.currentTime + 0.6);
 } else if (type === 'tick') {
 osc.type = 'sine';
 osc.frequency.setValueAtTime(600, ctx.currentTime);
 gain.gain.setValueAtTime(0.05, ctx.currentTime);
 gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
 osc.start();
 osc.stop(ctx.currentTime + 0.08);
 }
 } catch (err) {
 console.warn(err);
 }
};

const QUESTIONS_POOL = {
 webdev: [
 { q: "Which tag is used to create a hyperlink in HTML?", a: "Option B", options: ["Option A: <link>", "Option B: <a>", "Option C: <href>", "Option D: <anchor>"], targetLabel: { 'Option A': 'Top Left', 'Option B': 'Top Right', 'Option C': 'Bottom Left', 'Option D': 'Bottom Right' } },
 { q: "What does CSS stand for?", a: "Option C", options: ["Option A: Colorful Style Sheets", "Option B: Computer Style Sheets", "Option C: Cascading Style Sheets", "Option D: Creative Style Sheets"] },
 { q: "Which symbol is used for ID selectors in CSS?", a: "Option B", options: ["Option A: .", "Option B: #", "Option C: *", "Option D: @"] },
 { q: "Which method adds an element to the end of a JS array?", a: "Option B", options: ["Option A: pop()", "Option B: push()", "Option C: shift()", "Option D: unshift()"] },
 { q: "Which React hook is used to perform side effects?", a: "Option B", options: ["Option A: useState", "Option B: useEffect", "Option C: useContext", "Option D: useReducer"] }
 ],
 python: [
 { q: "What is the correct file extension for Python files?", a: "Option A", options: ["Option A: .py", "Option B: .pyt", "Option C: .pyw", "Option D: .python"] },
 { q: "Which keyword creates a function in Python?", a: "Option B", options: ["Option A: function", "Option B: def", "Option C: func", "Option D: define"] },
 { q: "Which function converts a value to an integer in Python?", a: "Option B", options: ["Option A: float()", "Option B: int()", "Option C: str()", "Option D: integer()"] },
 { q: "How do you start a comment in Python?", a: "Option C", options: ["Option A: //", "Option B: /*", "Option C: #", "Option D: --"] },
 { q: "What does list.pop() do in Python?", a: "Option B", options: ["Option A: Adds an item", "Option B: Removes the last item", "Option C: Reverses the list", "Option D: Clears the list"] }
 ],
 general: [
 { q: "What is the brain of the computer?", a: "Option B", options: ["Option A: RAM", "Option B: CPU", "Option C: Hard Disk", "Option D: Monitor"] },
 { q: "Which device is used to type text on a computer?", a: "Option B", options: ["Option A: Mouse", "Option B: Keyboard", "Option C: Printer", "Option D: Scanner"] },
 { q: "Which of these is a temporary storage memory?", a: "Option B", options: ["Option A: ROM", "Option B: RAM", "Option C: Hard Disk", "Option D: Pen Drive"] },
 { q: "What does URL stand for?", a: "Option A", options: ["Option A: Uniform Resource Locator", "Option B: Unique Resource Link", "Option C: Universal Radio Light", "Option D: United Route Link"] },
 { q: "Which protocol is used to secure web pages?", a: "Option B", options: ["Option A: HTTP", "Option B: HTTPS", "Option C: FTP", "Option D: SMTP"] }
 ]
};

const WorldCupPage = () => {
 const { user } = useAuth();
 const { showToast } = useToast();
 const chatEndRef = useRef(null);

 // App States
 const [screen, setScreen] = useState('lobby'); 
 const [isMuted, setIsMuted] = useState(true);
 const [squad, setSquad] = useState(null);
 const [squadLoading, setSquadLoading] = useState(true);
 const [standings, setStandings] = useState({ squadStandings: [], countryStandings: [] });
 const [showTeamSelection, setShowTeamSelection] = useState(false);
 const [hasPlayedToday, setHasPlayedToday] = useState(false);
 const [welcomeLoadStep, setWelcomeLoadStep] = useState(0);

 // Tabs inside Lobby
 const [lobbyTab, setLobbyTab] = useState('chat');
 const [standingsTab, setStandingsTab] = useState('squads');

 // Chat
 const [chatMessages, setChatMessages] = useState([]);
 const [chatInput, setChatInput] = useState('');

 // Match states
 const [matchQuestions, setMatchQuestions] = useState([]);
 const [qIndex, setQIndex] = useState(0);
 const [studentScore, setStudentScore] = useState(0);
 const [botScore, setBotScore] = useState(0);
 const [botFinalGoals, setBotFinalGoals] = useState(2);
 const [activeQuestion, setActiveQuestion] = useState(null);
 const [selectedAnswer, setSelectedAnswer] = useState(null);
 const [shootResult, setShootResult] = useState(null); 
 const [goalieDir, setGoalieDir] = useState('center'); 
 const [timeLeft, setTimeLeft] = useState(15);
 const [isSuddenDeath, setIsSuddenDeath] = useState(false);
 const [crowdEnergy, setCrowdEnergy] = useState(40); 
 const [botActiveKick, setBotActiveKick] = useState(null); // 'kicking', 'goal', 'saved', null
 const [matchMinute, setMatchMinute] = useState(12);

 const theme = TEAM_THEMES[user?.chosenTeam] || { primary: '#60A5FA', secondary: '#1E3A8A', gradient: 'linear-gradient(135deg, #1e1b4b, #09090b)', confetti: ['#60A5FA', '#1E3A8A'], flag: '' };
 const legendsList = LEGENDS[user?.chosenTeam] || ['Pele', 'Neymar Jr'];

 // Welcome Screen checklist animation
 useEffect(() => {
 if (screen === 'welcome') {
 setWelcomeLoadStep(0);
 const t1 = setTimeout(() => setWelcomeLoadStep(1), 600);
 const t2 = setTimeout(() => setWelcomeLoadStep(2), 1200);
 const t3 = setTimeout(() => setWelcomeLoadStep(3), 1800);
 const t4 = setTimeout(() => setWelcomeLoadStep(4), 2400);
 return () => {
 clearTimeout(t1);
 clearTimeout(t2);
 clearTimeout(t3);
 clearTimeout(t4);
 };
 }
 }, [screen]);

 // Welcome Screen tracking
 useEffect(() => {
 if (user?.uid && user?.worldcupGroupId) {
 const welcomeKey = `wc_welcome_seen_${user.uid}_${user.worldcupGroupId}`;
 if (!localStorage.getItem(welcomeKey)) {
 setScreen('welcome');
 } else {
 setScreen('lobby');
 }
 }
 }, [user?.uid, user?.worldcupGroupId]);

 // Subscribe to squad
 useEffect(() => {
 if (!user?.uid || !user?.worldcupGroupId) {
 setSquadLoading(false);
 return;
 }
 setSquadLoading(true);
 const squadRef = doc(db, 'worldcup_groups', user.worldcupGroupId);
 const unsub = onSnapshot(squadRef, (docSnap) => {
 if (docSnap.exists()) {
 setSquad({ id: docSnap.id, ...docSnap.data() });
 } else {
 setSquad(null);
 }
 setSquadLoading(false);
 });
 return unsub;
 }, [user?.uid, user?.worldcupGroupId]);

 // Subscribe to chat
 useEffect(() => {
 if (!user?.worldcupGroupId || screen !== 'lobby' || lobbyTab !== 'chat') return;
 const chatRef = collection(db, 'worldcup_chat');
 const q = query(
 chatRef,
 where('groupId', '==', user.worldcupGroupId),
 orderBy('timestamp', 'asc')
 );
 const unsub = onSnapshot(q, (snap) => {
 const msgs = [];
 snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
 setChatMessages(msgs);
 setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
 });
 return unsub;
 }, [user?.worldcupGroupId, screen, lobbyTab]);

 // Fetch standings
 useEffect(() => {
 if (screen !== 'lobby' || lobbyTab !== 'leaderboards') return;
 const fetchStandingsData = async () => {
 const activeSeason = await getActiveSeason();
 const res = await getStandings(activeSeason.id);
 setStandings(res);
 };
 fetchStandingsData();
 }, [screen, lobbyTab]);

 // Check daily played status
 useEffect(() => {
 if (!user?.uid) return;
 const playedKey = `wc_played_${user.uid}_${new Date().toDateString()}`;
 setHasPlayedToday(localStorage.getItem(playedKey) === 'true');
 }, [user?.uid]);

 // Question timer
 useEffect(() => {
 if (screen !== 'match' || selectedAnswer !== null || botActiveKick !== null) return;
 setTimeLeft(15);
 const timer = setInterval(() => {
 setTimeLeft(prev => {
 if (prev <= 1) {
 clearInterval(timer);
 handleTimeout();
 return 0;
 }
 playSoundEffect('tick', isMuted);
 return prev - 1;
 });
 }, 1000);
 return () => clearInterval(timer);
 }, [screen, qIndex, selectedAnswer, botActiveKick]);

 const handleTimeout = () => {
 setSelectedAnswer('__TIMEOUT__');
 setShootResult('timeout');
 setGoalieDir('center');
 setCrowdEnergy(c => Math.max(10, c - 15));
 playSoundEffect('save', isMuted);

 setTimeout(() => {
 triggerBotTurn();
 }, 2000);
 };

 const handleSelectAnswer = (opt) => {
 if (selectedAnswer !== null || botActiveKick !== null) return;
 setSelectedAnswer(opt);

 // Map opt index to shot targets
 const optionLetter = opt.split(':')[0]; // "Option A"
 let shootTarget = 'center';
 if (optionLetter.includes('A')) shootTarget = 'left';
 if (optionLetter.includes('B')) shootTarget = 'right';
 if (optionLetter.includes('C')) shootTarget = 'left';
 if (optionLetter.includes('D')) shootTarget = 'right';

 const goalieOptions = ['left', 'right', 'center'];
 const goalieChoice = goalieOptions[Math.floor(Math.random() * goalieOptions.length)];
 setGoalieDir(goalieChoice);

 const isCorrect = optionLetter.includes(activeQuestion.a);
 if (isCorrect) {
 setShootResult('goal');
 setStudentScore(prev => prev + 1);
 setCrowdEnergy(c => Math.min(100, c + 20));
 playSoundEffect('goal', isMuted);
 } else {
 setShootResult('saved');
 setCrowdEnergy(c => Math.max(10, c - 15));
 playSoundEffect('save', isMuted);
 }

 setTimeout(() => {
 triggerBotTurn();
 }, 2000);
 };

 const triggerBotTurn = () => {
 setSelectedAnswer(null);
 setShootResult(null);
 setGoalieDir('center');
 setBotActiveKick('kicking');

 setTimeout(() => {
 const botGoal = Math.random() < 0.6; // 60% chance
 if (botGoal) {
 setBotActiveKick('goal');
 setBotScore(b => b + 1);
 playSoundEffect('goal', isMuted);
 } else {
 setBotActiveKick('saved');
 playSoundEffect('save', isMuted);
 }

 setTimeout(() => {
 setBotActiveKick(null);
 advanceGameFlow();
 }, 2000);
 }, 1500);
 };

 const advanceGameFlow = () => {
 if (isSuddenDeath) {
 concludeMatch(studentScore, botScore);
 return;
 }

 const nextIdx = qIndex + 1;
 // Map minutes: 1st half up to 45 mins
 setMatchMinute(Math.round(12 + (nextIdx * 18)));

 if (nextIdx === 3) {
 setQIndex(3);
 setScreen('halftime');
 } else if (nextIdx < 5) {
 setQIndex(nextIdx);
 setActiveQuestion(matchQuestions[nextIdx]);
 } else {
 // Conclude match or tie sudden death
 if (studentScore === botScore) {
 setIsSuddenDeath(true);
 const category = user?.course?.toLowerCase().includes('python') ? 'python' : user?.course?.toLowerCase().includes('web') ? 'webdev' : 'general';
 const pool = QUESTIONS_POOL[category];
 const sdQ = pool[Math.floor(Math.random() * pool.length)];
 setActiveQuestion(sdQ);
 showToast('⚽ Sudden Death Penalty Shootout!', 'info');
 } else {
 concludeMatch(studentScore, botScore);
 }
 }
 };

 const concludeMatch = async (finalStudent, finalBot) => {
 let win = finalStudent > finalBot;
 setScreen('fulltime');

 try {
 const playedKey = `wc_played_${user.uid}_${new Date().toDateString()}`;
 localStorage.setItem(playedKey, 'true');
 setHasPlayedToday(true);

 const accuracy = Math.round((finalStudent / 5) * 100);
 await saveMatchAttempt(user.uid, user.worldcupGroupId, finalStudent, accuracy);
 } catch (err) {
 console.error(err);
 }
 };

 const startKickOffFlow = () => {
 if (hasPlayedToday) {
 showToast("You have already played today's match. Return tomorrow for the next match!", "info");
 return;
 }

 const category = user?.course?.toLowerCase().includes('python') ? 'python' : user?.course?.toLowerCase().includes('web') ? 'webdev' : 'general';
 const pool = QUESTIONS_POOL[category];
 const shuffled = [...pool].sort(() => 0.5 - Math.random());
 setMatchQuestions(shuffled);
 setQIndex(0);
 setActiveQuestion(shuffled[0]);
 setStudentScore(0);
 setBotScore(0);
 setIsSuddenDeath(false);
 setCrowdEnergy(40);
 setMatchMinute(12);

 setScreen('kickoff');
 playSoundEffect('whistle', isMuted);
 
 setTimeout(() => {
 setScreen('match');
 }, 3500);
 };

 const handleWelcomeDismiss = () => {
 const welcomeKey = `wc_welcome_seen_${user.uid}_${user.worldcupGroupId}`;
 localStorage.setItem(welcomeKey, 'true');
 setScreen('lobby');
 };

 const handleSendChat = async (e) => {
 e.preventDefault();
 if (!chatInput.trim() || !user?.worldcupGroupId) return;
 const text = chatInput.trim();
 setChatInput('');
 try {
 await sendTeamChatMessage(user.worldcupGroupId, user.uid, user.displayName || user.name || 'Student', text);
 } catch (err) {
 showToast('Message failed', 'error');
 }
 };

 const handleLeaveTeam = async () => {
 if (window.confirm('Are you sure you want to leave your squad? Your stats remain but you will draft out.')) {
 try {
 await leaveWorldCupTeam(user.uid);
 showToast('Successfully left the World Cup squad.', 'info');
 } catch (err) {
 showToast('Error leaving squad', 'error');
 }
 }
 };

 const handleShareInvite = () => {
 const text = encodeURIComponent(`⚽ Represent ${user?.chosenTeam || 'our country'} with me on Compution World Cup Mania! Draft into my squad, beat the Bot, and let's climb the leaderboard! Join here: https://compution.vercel.app`);
 window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
 };

 if (squadLoading) {
 return (
 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
 <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite' }} />
 </div>
 );
 }

 // ——— UNJOINED STATE ———
 if (!user?.chosenTeam || !user?.worldcupGroupId || !squad) {
 return (
 <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center', color: 'white', background: 'radial-gradient(circle at center, #1e1b4b 0%, #09090b 100%)', borderRadius: '32px', border: '1.5px solid rgba(99,102,241,0.2)', boxShadow: '0 25px 70px rgba(0,0,0,0.4)' }}>
 <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
 <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
 <circle cx="40" cy="40" r="38" stroke="#60A5FA" strokeWidth="2" fill="rgba(96,165,250,0.08)" />
 <circle cx="40" cy="40" r="26" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
 <ellipse cx="40" cy="40" rx="12" ry="26" stroke="#60A5FA" strokeWidth="1.5" fill="none" />
 <line x1="14" y1="40" x2="66" y2="40" stroke="#60A5FA" strokeWidth="1.5" />
 <line x1="40" y1="14" x2="40" y2="66" stroke="#60A5FA" strokeWidth="1.5" />
 </svg>
 </div>
 <h1 style={{ fontSize: '2.4rem', fontWeight: 950, letterSpacing: '0.05em', margin: '0 0 12px', color: '#60A5FA' }}>WORLD CUP MANIA 2026</h1>
 <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
 <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
 Limited Time Campus Championship
 </div>
 <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', margin: '0 auto 36px', lineHeight: 1.6 }}>
 Choose your favorite country, join a 4-player competitive squad, and beat the Bot to earn XP, coins, and ranking points!
 </p>
 <button
 onClick={() => setShowTeamSelection(true)}
 style={{
 padding: '16px 44px', borderRadius: '100px',
 background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
 color: 'white', fontWeight: 900, fontSize: '1.05rem', border: 'none', cursor: 'pointer',
 boxShadow: '0 10px 24px rgba(99, 102, 249, 0.4)', transition: 'transform 0.2s'
 }}
 onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
 onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
 >
 Draft My Team
 </button>

 <AnimatePresence>
 {showTeamSelection && (
 <div style={{
 position: 'fixed', inset: 0, zIndex: 99999,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)'
 }}>
 <div style={{ background: '#09090b', padding: '12px', borderRadius: '24px', width: 'min(92vw, 750px)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
 <TeamSelection 
 user={user} 
 onClose={() => setShowTeamSelection(false)} 
 onJoined={() => setShowTeamSelection(false)}
 />
 </div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
 }

 // ——— SCREEN 1: WELCOME SCREEN (STADIUM TUNNEL STAGE) ———
 if (screen === 'welcome') {
 const isFirst = squad.members?.length <= 1;
 const td = TEAM_DETAILS[user.chosenTeam] || {
 iso: user.chosenTeam?.substring(0, 2).toUpperCase() || 'XX',
 isoLabel: user.chosenTeam?.toUpperCase() || 'TEAM',
 primary: theme.primary,
 secondary: '#ffffff',
 textAccent: theme.primary,
 buttonGradient: `linear-gradient(90deg, ${theme.primary}, #111827)`,
 buttonTextColor: '#ffffff',
 jerseyBg: theme.primary,
 jerseyStripes: false,
 jerseyNumber: '10',
 jerseyAccentColor: '#ffffff',
 overlayColor: 'rgba(5,15,5,0.7)',
 accentLine: theme.primary,
 squadAlphaColor: theme.primary,
 legends: (legendsList || []).map((name, i) => ({ name, nickname: '', initials: name.substring(0, 2).toUpperCase(), bg: '#1a1a2e' }))
 };

 const squadLabel = squad?.name?.split(' ').slice(1).join(' ') || 'ALPHA';

 // Icon checklist items
 const checklistItems = [
 { icon: <Check size={16} strokeWidth={3} />, label: 'Squad Joined', step: 1, doneColor: td.primary },
 { icon: <Star size={16} strokeWidth={2} fill="currentColor" />, label: 'Captain Assigned', step: 2, doneColor: '#FEDF00' },
 { icon: <Shield size={16} strokeWidth={2} />, label: 'Stadium Ready', step: 3, doneColor: '#60A5FA' },
 { icon: <Play size={16} strokeWidth={2} fill="currentColor" />, label: 'Kickoff Ready', step: 4, doneColor: '#FEDF00' }
 ];

 return (
 <div style={{
 position: 'relative',
 width: '100%',
 minHeight: '88vh',
 borderRadius: '24px',
 overflow: 'hidden',
 fontFamily: "'Inter', system-ui, sans-serif",
 color: 'white',
 display: 'flex',
 flexDirection: 'column'
 }}>
 {/* === FULL STADIUM BACKGROUND === */}
 <div style={{
 position: 'absolute',
 inset: 0,
 backgroundImage: 'url("https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=85")',
 backgroundSize: 'cover',
 backgroundPosition: 'center top',
 zIndex: 0
 }} />
 {/* Dark overlay for readability */}
 <div style={{
 position: 'absolute', inset: 0,
 background: `linear-gradient(180deg, ${td.overlayColor} 0%, rgba(3,8,20,0.82) 100%)`,
 zIndex: 1
 }} />
 {/* Confetti dots */}
 <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
 backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
 backgroundSize: '40px 40px', opacity: 0.06 }} />

 {/* === TOP RIGHT: Leave Squad === */}
 <button
 onClick={handleLeaveTeam}
 style={{
 position: 'absolute', top: '20px', right: '20px', zIndex: 20,
 display: 'flex', alignItems: 'center', gap: '7px',
 padding: '9px 18px', borderRadius: '8px',
 border: '1.5px solid rgba(239,68,68,0.55)',
 background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
 color: '#ef4444', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
 transition: 'all 0.2s'
 }}
 onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
 onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}
 >
 <LogOut size={14} /> Leave Squad
 </button>

 {/* === MAIN 3-COLUMN LAYOUT === */}
 <div style={{
 position: 'relative', zIndex: 10,
 display: 'grid',
 gridTemplateColumns: '280px 1fr 240px',
 gap: '24px',
 padding: '28px 24px',
 flex: 1,
 alignItems: 'start',
 minHeight: '88vh'
 }}>

 {/* ——— LEFT: Squad Roster Panel ——— */}
 <div style={{
 background: 'rgba(5,10,25,0.75)',
 backdropFilter: 'blur(16px)',
 border: '1px solid rgba(255,255,255,0.09)',
 borderRadius: '20px',
 padding: '22px',
 display: 'flex', flexDirection: 'column', gap: '16px'
 }}>
 <div>
 <div style={{ fontSize: '0.72rem', fontWeight: 900, color: td.squadAlphaColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
 SQUAD: {squadLabel}
 </div>
 <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
 Members ({squad.members?.length || 1}/4)
 </div>
 </div>

 {/* Member slots — live updates as players join */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
 {[0, 1, 2, 3].map(idx => {
 const member = squad.members?.[idx] || null;
 const isCurrentUser = member?.uid === user.uid;
 const isCapt = squad.captain === member?.uid;
 // Display the actual student name from Firestore, not hardcoded
 const displayName = member?.username || member?.name || member?.displayName || 'Unknown';

 return member ? (
 <motion.div
 key={member.uid || idx}
 initial={{ opacity: 0, x: -12 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: idx * 0.1 }}
 style={{
 display: 'flex', alignItems: 'center', gap: '12px',
 padding: '11px 14px',
 background: isCurrentUser ? `rgba(${td.primary === '#FEDF00' ? '254,223,0' : '99,102,241'},0.08)` : 'rgba(255,255,255,0.03)',
 border: isCurrentUser ? `1px solid ${td.primary}40` : '1px solid rgba(255,255,255,0.05)',
 borderRadius: '14px'
 }}
 >
 {/* Avatar circle with initial */}
 <div style={{
 width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
 background: `linear-gradient(135deg, ${td.primary}cc, ${td.primary}55)`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: '0.9rem', fontWeight: 900, color: '#fff',
 border: isCurrentUser ? `2px solid ${td.primary}` : '2px solid rgba(255,255,255,0.1)',
 boxShadow: isCurrentUser ? `0 0 12px ${td.primary}40` : 'none'
 }}>
 {displayName[0]?.toUpperCase() || 'S'}
 </div>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
 <span style={{ fontSize: '0.88rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
 {displayName}
 </span>
 {isCurrentUser && (
 <span style={{ fontSize: '0.65rem', fontWeight: 900, background: td.primary, color: td.buttonTextColor || '#000', padding: '1px 7px', borderRadius: '100px' }}>You</span>
 )}
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
 <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
 <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>
 {isCapt ? '👑 Captain' : 'Player'}
 </span>
 </div>
 </div>
 </motion.div>
 ) : (
 <div
 key={`empty-${idx}`}
 style={{
 display: 'flex', alignItems: 'center', gap: '12px',
 padding: '11px 14px',
 border: '1px dashed rgba(255,255,255,0.1)',
 borderRadius: '14px'
 }}
 >
 <div style={{
 width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
 border: '1px dashed rgba(255,255,255,0.2)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 color: 'rgba(255,255,255,0.2)', fontSize: '1.1rem'
 }}>
 <Users size={16} />
 </div>
 <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
 Waiting for teammate...
 </span>
 </div>
 );
 })}
 </div>
 </div>

 {/* ——— CENTER: Main Hero Area ——— */}
 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '12px' }}>
 
 {/* ISO Code */}
 <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
 — {td.iso} —
 </div>

 {/* Jersey in glowing circle */}
 <motion.div
 animate={{ y: [0, -7, 0] }}
 transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
 style={{
 width: '120px', height: '120px', borderRadius: '50%',
 background: 'rgba(0,0,0,0.5)',
 border: `2.5px solid ${td.primary}`,
 boxShadow: `0 0 30px ${td.primary}30, 0 0 60px ${td.primary}15`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 marginBottom: '18px'
 }}
 >
 <RenderJerseySVG
 primaryColor={td.jerseyBg}
 secondaryColor={td.jerseyAccentColor}
 stripes={td.jerseyStripes}
 number={td.jerseyNumber}
 />
 </motion.div>

 {/* Country Name with decorative separators */}
 <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
 <div style={{ width: '50px', height: '2px', background: `linear-gradient(90deg, transparent, ${td.accentLine})` }} />
 <h1 style={{
 fontSize: 'clamp(2.4rem, 5vw, 4rem)',
 fontWeight: 950,
 margin: 0,
 letterSpacing: '0.06em',
 textTransform: 'uppercase',
 color: 'white',
 textShadow: '0 2px 20px rgba(0,0,0,0.8)',
 lineHeight: 1
 }}>
 {user.chosenTeam?.toUpperCase()}
 </h1>
 <div style={{ width: '50px', height: '2px', background: `linear-gradient(90deg, ${td.accentLine}, transparent)` }} />
 </div>

 {/* Tagline */}
 <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', maxWidth: '400px', lineHeight: 1.55, margin: '0 0 24px', textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>
 The crowd is roaring. You've been selected to represent {user.chosenTeam}. Lead your squad to glory!
 </p>

 {/* Squad Alpha pill */}
 <div style={{
 display: 'inline-flex', alignItems: 'center', gap: '7px',
 background: 'rgba(0,0,0,0.5)', border: `1.5px solid ${td.primary}60`,
 padding: '6px 18px', borderRadius: '100px', marginBottom: '22px',
 fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.08em',
 color: td.primary, boxShadow: `0 0 20px ${td.primary}20`
 }}>
 <Star size={12} fill="currentColor" /> SQUAD {squadLabel}
 </div>

 {/* Checklist — icon columns */}
 <div style={{
 display: 'flex', gap: '8px', justifyContent: 'center',
 background: 'rgba(3,8,20,0.7)', backdropFilter: 'blur(12px)',
 border: '1px solid rgba(255,255,255,0.08)',
 borderRadius: '16px', padding: '16px 20px', marginBottom: '18px',
 width: '100%', maxWidth: '500px'
 }}>
 {checklistItems.map((item, i) => {
 const done = welcomeLoadStep >= item.step;
 return (
 <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
 <div style={{
 width: '38px', height: '38px', borderRadius: '50%',
 background: done ? `${item.doneColor}18` : 'rgba(255,255,255,0.04)',
 border: `1.5px solid ${done ? item.doneColor : 'rgba(255,255,255,0.1)'}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 color: done ? item.doneColor : 'rgba(255,255,255,0.25)',
 transition: 'all 0.4s ease',
 boxShadow: done ? `0 0 12px ${item.doneColor}25` : 'none'
 }}>
 {item.icon}
 </div>
 <span style={{ fontSize: '0.7rem', fontWeight: 700, color: done ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.3 }}>
 {item.label}
 </span>
 </div>
 );
 })}
 </div>

 {/* Captain / Member card */}
 <div style={{
 width: '100%', maxWidth: '500px',
 background: 'rgba(3,8,20,0.7)', backdropFilter: 'blur(12px)',
 border: '1px solid rgba(255,255,255,0.08)',
 borderRadius: '16px', padding: '16px 20px',
 marginBottom: '22px', textAlign: 'left'
 }}>
 {isFirst ? (
 <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
 <div style={{
 width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
 background: 'rgba(254,223,0,0.1)', border: '1.5px solid rgba(254,223,0,0.4)',
 display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem'
 }}>👑</div>
 <div>
 <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#FEDF00', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>CAPTAIN APPOINTED</div>
 <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
 No one reached the dressing room before you.<br />
 You now lead {user.chosenTeam} Squad {squadLabel}. Your mission begins today.
 </div>
 </div>
 </div>
 ) : (
 <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
 <div style={{
 width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
 background: 'rgba(96,165,250,0.1)', border: '1.5px solid rgba(96,165,250,0.4)',
 display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem'
 }}>🛡️ </div>
 <div>
 <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>DRESSED FOR THE MATCH</div>
 <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
 You've joined the national lineup. Support Captain 👑 <strong>{squad.captainName || 'your leader'}</strong> and represent the team!
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Legends Row */}
 <div style={{ width: '100%', maxWidth: '520px', marginBottom: '24px' }}>
 <div style={{ fontSize: '0.68rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center', marginBottom: '12px' }}>
 INSPIRED BY THE LEGENDS
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
 {td.legends.map((leg, idx) => {
 const nameParts = leg.name.split('\n');
 return (
 <div
 key={idx}
 style={{
 background: 'rgba(3,8,20,0.75)', backdropFilter: 'blur(8px)',
 border: '1px solid rgba(255,255,255,0.07)',
 borderRadius: '14px', padding: '12px 8px',
 display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
 transition: 'transform 0.2s'
 }}
 onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
 onMouseLeave={e => e.currentTarget.style.transform = 'none'}
 >
 {/* Photo-style avatar with initials */}
 <div style={{
 width: '48px', height: '48px', borderRadius: '12px',
 background: `linear-gradient(135deg, ${leg.bg || '#1a1a2e'}, ${leg.bg || '#1a1a2e'}dd)`,
 border: '1px solid rgba(255,255,255,0.1)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: '1rem', fontWeight: 900, color: td.primary
 }}>
 {leg.initials}
 </div>
 {/* Name */}
 <div style={{ textAlign: 'center' }}>
 {nameParts.map((part, pi) => (
 <div key={pi} style={{ fontSize: pi === 0 ? '0.78rem' : '0.75rem', fontWeight: pi === 0 ? 800 : 700, color: 'white', lineHeight: 1.2 }}>
 {part}
 </div>
 ))}
 </div>
 {/* Nickname */}
 {leg.nickname && (
 <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.2 }}>
 {leg.nickname}
 </div>
 )}
 {/* Team flag / accent dot */}
 <div style={{ width: '20px', height: '3px', borderRadius: '2px', background: td.primary, opacity: 0.7 }} />
 </div>
 );
 })}
 </div>
 </div>

 {/* CTA Button */}
 <AnimatePresence>
 {welcomeLoadStep >= 4 ? (
 <motion.button
 key="cta-btn"
 initial={{ opacity: 0, y: 14, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 transition={{ duration: 0.35 }}
 onClick={startKickOffFlow}
 style={{
 display: 'flex', alignItems: 'center', gap: '10px',
 padding: '17px 52px', borderRadius: '100px', border: 'none',
 background: td.buttonGradient,
 color: td.buttonTextColor || 'white',
 fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', letterSpacing: '0.04em',
 boxShadow: `0 8px 28px rgba(0,0,0,0.4)`,
 marginBottom: '12px',
 transition: 'transform 0.2s, box-shadow 0.2s'
 }}
 onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = `0 12px 36px rgba(0,0,0,0.5)`; }}
 onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.4)`; }}
 >
 <span style={{ fontSize: '1.2rem' }}>⚽</span> PLAY YOUR FIRST MATCH
 </motion.button>
 ) : (
 <div key="loading-cta" style={{ height: '56px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
 <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: td.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
 Preparing kickoff...
 </div>
 )}
 </AnimatePresence>

 {/* View Squad Lobby link */}
 <button
 onClick={handleWelcomeDismiss}
 style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', transition: 'color 0.2s' }}
 onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
 onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
 >
 View Squad Lobby <span style={{ fontSize: '0.9rem' }}>›</span>
 </button>
 </div>

 {/* ——— RIGHT: Stats Panel ——— */}
 <div style={{
 background: 'rgba(5,10,25,0.75)',
 backdropFilter: 'blur(16px)',
 border: '1px solid rgba(255,255,255,0.09)',
 borderRadius: '20px',
 padding: '22px',
 display: 'flex', flexDirection: 'column', gap: '0'
 }}>
 {[
 {
 label: 'SQUAD POINTS',
 value: squad.totalScore || 0,
 sub: '0 goals scored overall',
 icon: <Trophy size={22} color="#FEDF00" />,
 valueColor: '#FEDF00'
 },
 {
 label: 'SQUAD RANK',
 value: '—',
 sub: 'Not ranked yet',
 icon: (
 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2">
 <rect x="2" y="14" width="4" height="7" rx="1" /><rect x="9" y="9" width="4" height="12" rx="1" /><rect x="16" y="4" width="4" height="17" rx="1" />
 </svg>
 ),
 valueColor: '#60A5FA'
 },
 {
 label: 'GLOBAL RANK',
 value: '—',
 sub: 'Play matches to rank up!',
 icon: (
 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2">
 <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
 </svg>
 ),
 valueColor: '#60A5FA'
 }
 ].map((stat, i) => (
 <div key={i} style={{
 display: 'flex', flexDirection: 'column', gap: '6px',
 padding: '18px 0',
 borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none'
 }}>
 <div style={{ fontSize: '0.68rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
 {stat.label}
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
 {stat.icon}
 <span style={{ fontSize: '1.6rem', fontWeight: 900, color: stat.valueColor }}>
 {stat.value}
 </span>
 </div>
 <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{stat.sub}</div>
 </div>
 ))}
 </div>

 </div>
 <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
 </div>
 );
 }

 // ——— SCREEN 2: KICK OFF TRANSITION ———
 if (screen === 'kickoff') {
 return (
 <div style={{
 background: '#020617', minHeight: '85vh', display: 'flex', flexDirection: 'column',
 alignItems: 'center', justifyContent: 'center', color: 'white', borderRadius: '32px'
 }}>
 <div style={{ fontSize: '6rem', marginBottom: '16px', animation: 'bounce 1s infinite' }}>⚽</div>
 <div style={{ fontSize: '0.85rem', fontWeight: 900, color: theme.primary, textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '12px' }}>
 WORLD CUP MANIA
 </div>
 <h1 style={{ fontSize: '2.5rem', fontWeight: 950, textTransform: 'uppercase', margin: '0 0 24px' }}>
 {user.chosenTeam} <span style={{ color: 'rgba(255,255,255,0.3)' }}>VS</span> BOT
 </h1>
 
 {/* Countdown Animation */}
 <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
 <motion.div
 initial={{ scale: 0.5, opacity: 0 }}
 animate={{ scale: [1, 1.5, 1], opacity: [0, 1, 0] }}
 transition={{ duration: 3, times: [0, 0.5, 1] }}
 style={{ fontSize: '3rem', fontWeight: 950, color: '#f59e0b' }}
 >
 3... 2... 1... Kick Off!
 </motion.div>
 </div>
 </div>
 );
 }

 // ——— SCREEN 3: ACTIVE MATCH PENALTY ENGINE (SPLIT MATCH BROADCAST VIEW) ———
 if (screen === 'match' && activeQuestion) {
 return (
 <div style={{
 background: 'radial-gradient(circle at center, #0b0f19 0%, #020617 100%)',
 minHeight: '85vh', display: 'flex', flexDirection: 'column',
 color: 'white', padding: '20px', borderRadius: '32px'
 }}>
 {/* TV Style Scoreboard & Broadcast Banner */}
 <div style={{
 width: '100%', maxWidth: '650px', margin: '0 auto 20px',
 background: 'rgba(0,0,0,0.5)', border: '1.5px solid rgba(255,255,255,0.06)',
 borderRadius: '16px', padding: '12px 20px', display: 'flex',
 justifyContent: 'space-between', alignItems: 'center', position: 'relative'
 }}>
 {/* Live broadcast visual element */}
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
 <span style={{ fontSize: '1.1rem' }}>{theme.flag}</span>
 <strong style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.chosenTeam}</strong>
 <span style={{ fontSize: '1.2rem', fontWeight: 900, background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: '6px', margin: '0 8px' }}>
 {studentScore} - {botScore}
 </span>
 <strong style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)' }}>BOT 🤖</strong>
 </div>

 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
 {/* Crowd energy bar */}
 <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
 <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800 }}>Crowd Meter</span>
 <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', marginTop: '3px', overflow: 'hidden' }}>
 <div style={{ width: `${crowdEnergy}%`, height: '100%', background: crowdEnergy >= 80 ? '#f59e0b' : theme.primary }} />
 </div>
 </div>

 <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

 <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
 <span>± {matchMinute}'</span>
 </div>
 </div>
 </div>

 {/* 15s shrinking progress bar */}
 {botActiveKick === null && (
 <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto 20px' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}>
 <span>⚽ PENALTY SHOT #{qIndex + 1}</span>
 <span style={{ color: timeLeft <= 5 ? '#ef4444' : '#f59e0b' }}>{timeLeft}s REMAINING</span>
 </div>
 <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', overflow: 'hidden' }}>
 <div style={{ width: `${(timeLeft / 15) * 100}%`, height: '100%', background: timeLeft <= 5 ? '#ef4444' : '#f59e0b', transition: 'width 1s linear' }} />
 </div>
 </div>
 )}

 {/* TV Broadcaster field box (Split visual structure) */}
 <div style={{
 flex: 1.2, width: '100%', maxWidth: '650px', margin: '0 auto 24px',
 background: 'rgba(16, 185, 129, 0.05)',
 border: `2px solid ${theme.primary}30`, borderRadius: '24px',
 position: 'relative', overflow: 'hidden', minHeight: '220px',
 display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
 }}>
 {/* Turf grid lines */}
 <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.2) 2px, transparent 2px)', backgroundSize: '30px 30px' }} />
 
 {/* Stadium spot lighting overlay */}
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60px', background: `linear-gradient(180deg, ${theme.primary}12 0%, transparent 100%)`, pointerEvents: 'none' }} />

 {/* Goalie Representation */}
 <motion.div
 animate={{
 x: goalieDir === 'left' ? -130 : goalieDir === 'right' ? 130 : 0,
 rotate: goalieDir === 'left' ? -35 : goalieDir === 'right' ? 35 : 0,
 y: goalieDir !== 'center' ? 10 : 0
 }}
 transition={{ duration: 0.25, type: 'spring' }}
 style={{ fontSize: '3.2rem', position: 'absolute', top: '35px', zIndex: 5 }}
 >
 🧤
 </motion.div>

 {/* Target Corners Overlay (Aiming Guides) */}
 {selectedAnswer === null && botActiveKick === null && (
 <div style={{ position: 'absolute', inset: '16px', pointerEvents: 'none', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
 <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>A: TOP LEFT</div>
 <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>B: TOP RIGHT</div>
 <div style={{ position: 'absolute', bottom: '10px', left: '10px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>C: BOT LEFT</div>
 <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>D: BOT RIGHT</div>
 </div>
 )}

 {/* Match events commentary feedback */}
 <div style={{ zIndex: 6, textAlign: 'center', padding: '10px' }}>
 {botActiveKick !== null ? (
 <div style={{ animation: 'pulse 1s infinite' }}>
 {botActiveKick === 'kicking' && (
 <div>
 <div style={{ fontSize: '2.5rem' }}>🤖⚽</div>
 <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bot's Turn. Shooting...</div>
 </div>
 )}
 {botActiveKick === 'goal' && (
 <div style={{ color: '#ef4444' }}>
 <div style={{ fontSize: '2.8rem', fontWeight: 950 }}>BOT SCORES! 🤖⚽</div>
 <div style={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.9 }}>"What a strike! The goalie was beaten."</div>
 </div>
 )}
 {botActiveKick === 'saved' && (
 <div style={{ color: '#10b981' }}>
 <div style={{ fontSize: '2.8rem', fontWeight: 950 }}>SAVED BY KEEPER! 🧤</div>
 <div style={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.9 }}>"Incredible diving save by your keeper!"</div>
 </div>
 )}
 </div>
 ) : (
 <div>
 {shootResult === null ? (
 <div>
 <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Choose your target corner to shoot!</div>
 {crowdEnergy >= 85 && <div style={{ fontSize: '0.78rem', color: '#FEDF00', fontWeight: 900, marginTop: '4px', animation: 'bounce 0.5s infinite' }}>🔥 CROWD IS ROARING</div>}
 </div>
 ) : shootResult === 'goal' ? (
 <div style={{ color: '#10b981' }}>
 <div style={{ fontSize: '3rem', fontWeight: 950 }}>GOOOOOOOAL!!! ⚽🔥</div>
 <div style={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.9 }}>"What a finish! The goalkeeper had no chance!"</div>
 </div>
 ) : shootResult === 'timeout' ? (
 <div style={{ color: '#ef4444' }}>
 <div style={{ fontSize: '2.8rem', fontWeight: 950 }}>MISS! ❌</div>
 <div style={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.9 }}>"Shot clock violation! The penalty window closed."</div>
 </div>
 ) : (
 <div style={{ color: '#ef4444' }}>
 <div style={{ fontSize: '2.8rem', fontWeight: 950 }}>SAVED! 🧤</div>
 <div style={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.9 }}>"The goalie guessed correctly and punched it away!"</div>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Question & Target buttons split */}
 {botActiveKick === null && (
 <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
 <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 24px', lineHeight: 1.4, color: 'white' }}>
 {activeQuestion.q}
 </h2>

 {/* Split options buttons mapping to corners */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="grid-2-col-mobile">
 {activeQuestion.options.map((opt, idx) => {
 const isSelected = selectedAnswer === opt;
 const optLetter = opt.split(':')[0]; // "Option A"
 const isCorrect = optLetter.includes(activeQuestion.a);
 
 let bg = 'rgba(255,255,255,0.03)';
 let border = 'rgba(255,255,255,0.06)';
 let color = 'white';
 
 // Determine target text
 let targetText = 'TOP LEFT';
 if (optLetter.includes('B')) targetText = 'TOP RIGHT';
 if (optLetter.includes('C')) targetText = 'BOT LEFT';
 if (optLetter.includes('D')) targetText = 'BOT RIGHT';

 if (selectedAnswer !== null) {
 if (isCorrect) {
 bg = 'rgba(16,185,129,0.12)';
 border = '#10b981';
 color = '#10b981';
 } else if (isSelected) {
 bg = 'rgba(239,68,68,0.12)';
 border = '#ef4444';
 color = '#ef4444';
 }
 }

 return (
 <button
 key={idx}
 onClick={() => handleSelectAnswer(opt)}
 disabled={selectedAnswer !== null}
 style={{
 padding: '16px', borderRadius: '20px', border: `1.5px solid ${border}`,
 background: bg, color, fontWeight: 800, fontSize: '0.85rem',
 cursor: selectedAnswer !== null ? 'default' : 'pointer',
 display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
 transition: 'all 0.2s'
 }}
 >
 <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 900 }}>
 Aim: {targetText}
 </span>
 <span>{opt}</span>
 </button>
 );
 })}
 </div>
 </div>
 )}
 </div>
 );
 }

 // ——— SCREEN 4: HALF TIME SCOREBOARD ———
 if (screen === 'halftime') {
 return (
 <div style={{
 background: 'radial-gradient(circle at center, #1e1b4b 0%, #020617 100%)',
 minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
 color: 'white', padding: '24px', borderRadius: '32px'
 }}>
 <div style={{ fontSize: '5rem', marginBottom: '16px' }}>⏱</div>
 <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '8px' }}>
 Match Summary
 </div>
 <h1 style={{ fontSize: '2.5rem', fontWeight: 950, margin: '0 0 32px' }}>HALF TIME</h1>
 
 <div style={{
 display: 'flex', alignItems: 'center', gap: '32px',
 background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
 padding: '24px 48px', borderRadius: '24px', marginBottom: '24px'
 }}>
 <div style={{ textAlign: 'center' }}>
 <div style={{ fontSize: '2.2rem' }}>{theme.flag}</div>
 <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', textTransform: 'uppercase', fontWeight: 800 }}>{user.chosenTeam}</div>
 <div style={{ fontSize: '3rem', fontWeight: 950, marginTop: '8px' }}>{studentScore}</div>
 </div>
 <div style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.1)', fontWeight: 800 }}>VS</div>
 <div style={{ textAlign: 'center' }}>
 <div style={{ fontSize: '2.2rem' }}>🤖</div>
 <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', textTransform: 'uppercase', fontWeight: 800 }}>BOT</div>
 <div style={{ fontSize: '3rem', fontWeight: 950, marginTop: '8px' }}>{botScore}</div>
 </div>
 </div>

 {/* Half-time Stats */}
 <div style={{ width: '240px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px', fontSize: '0.85rem' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
 <span style={{ color: 'rgba(255,255,255,0.4)' }}>Possession</span>
 <strong>62%</strong>
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
 <span style={{ color: 'rgba(255,255,255,0.4)' }}>Shots Taken</span>
 <strong>3</strong>
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
 <span style={{ color: 'rgba(255,255,255,0.4)' }}>Target Accuracy</span>
 <strong>{Math.round((studentScore / 3) * 100)}%</strong>
 </div>
 </div>

 <button
 onClick={() => {
 setScreen('match');
 setActiveQuestion(matchQuestions[3]);
 }}
 style={{
 padding: '16px 48px', borderRadius: '100px', border: 'none',
 background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white',
 fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
 boxShadow: '0 8px 20px rgba(99,102,241,0.3)'
 }}
 >
 Continue Second Half →
 </button>
 </div>
 );
 }

 // ——— SCREEN 5: FINAL WHISTLE / FULL TIME REWARDS ———
 if (screen === 'fulltime') {
 const isWin = studentScore > botScore;
 return (
 <div style={{
 background: `radial-gradient(circle at center, ${isWin ? '#022c22' : '#7c2d12'}25 0%, #020617 100%)`,
 minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
 color: 'white', padding: '24px', textAlign: 'center', borderRadius: '32px'
 }}>
 <div style={{ fontSize: '6rem', marginBottom: '16px' }}>{isWin ? '🏆' : '⚽'}</div>
 <div style={{ fontSize: '0.85rem', fontWeight: 900, color: isWin ? '#10b981' : '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '8px' }}>
 90' whistle
 </div>
 <h1 style={{ fontSize: '3rem', fontWeight: 950, margin: '0 0 32px' }}>FULL TIME</h1>

 <div style={{
 display: 'flex', alignItems: 'center', gap: '32px',
 background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
 padding: '24px 48px', borderRadius: '24px', marginBottom: '32px'
 }}>
 <div>
 <div style={{ fontSize: '2rem' }}>{theme.flag}</div>
 <div style={{ fontSize: '2.5rem', fontWeight: 950, marginTop: '6px' }}>{studentScore}</div>
 </div>
 <div style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>VS</div>
 <div>
 <div style={{ fontSize: '2rem' }}>🤖</div>
 <div style={{ fontSize: '2.5rem', fontWeight: 950, marginTop: '6px' }}>{botScore}</div>
 </div>
 </div>

 {/* Rewards */}
 <div style={{ marginBottom: '40px' }}>
 <h4 style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800 }}>Rewards Earned</h4>
 <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
 <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
 <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>XP</div>
 <strong style={{ fontSize: '1.2rem', color: '#10B981', display: 'block', marginTop: '2px' }}>{isWin ? '+150 XP' : '+30 XP'}</strong>
 </div>
 <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
 <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>COINS</div>
 <strong style={{ fontSize: '1.2rem', color: '#F59E0B', display: 'block', marginTop: '2px' }}>{isWin ? '+50 Coins' : '+15 Coins'}</strong>
 </div>
 <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
 <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>SQUAD POINTS</div>
 <strong style={{ fontSize: '1.2rem', color: '#60A5FA', display: 'block', marginTop: '2px' }}>{isWin ? '+15 Pts' : '+5 Pts'}</strong>
 </div>
 </div>
 </div>

 <button
 onClick={() => setScreen('lobby')}
 style={{
 padding: '16px 48px', borderRadius: '100px', border: 'none',
 background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
 fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
 boxShadow: '0 8px 20px rgba(16,185,129,0.3)'
 }}
 >
 Return to Dressing Room
 </button>
 </div>
 );
 }

 // ——— LOBBY / SQUAD DRESSING ROOM SCREEN ———
 const isCaptain = squad.captain === user.uid;
 const seats = [0, 1, 2, 3].map(i => squad.members?.[i] || null);

 return (
 <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', color: 'white' }}>
 
 {/* Header bar */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
 <div>
 <span style={{ fontSize: '0.75rem', fontWeight: 900, color: theme.primary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
 🌍 SEASONAL EVENT: WORLD CUP MANIA
 </span>
 <h1 style={{ fontSize: '2.2rem', fontWeight: 950, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
 {theme.flag} {user.chosenTeam.toUpperCase()}
 </h1>
 <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
 Squad: 🛡️ <strong>{squad.name.split(' ').slice(1).join(' ')}</strong>
 </p>
 </div>

 <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
 <button 
 onClick={() => setIsMuted(p => !p)}
 style={{ padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'white', cursor: 'pointer' }}
 >
 {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
 </button>
 
 <button
 onClick={handleLeaveTeam}
 style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
 >
 Leave Squad
 </button>
 </div>
 </div>

 {/* Main Grid: Dressing Room on Left, Chat/Leaderboard on Right */}
 <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }} className="grid-2-col-mobile">
 
 {/* Left Side: 4 Seats Locker Dressing Room */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
 <div style={{ 
 background: 'linear-gradient(135deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.6) 100%)',
 border: '1.5px solid rgba(255,255,255,0.06)', borderRadius: '28px', padding: '28px',
 position: 'relative', overflow: 'hidden'
 }}>
 {/* Stadium spot lighting effect */}
 <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '200px', height: '100px', background: 'radial-gradient(ellipse at top, rgba(99,102,241,0.15) 0%, transparent 80%)', pointerEvents: 'none' }} />

 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
 <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: theme.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
 Squad Dressing Room
 </h3>
 
 {/* Squad Objective target card */}
 <div style={{ fontSize: '0.72rem', color: '#FEDF00', background: 'rgba(254,223,0,0.08)', border: '1px solid rgba(254,223,0,0.2)', padding: '4px 10px', borderRadius: '100px', fontWeight: 800 }}>
 ★ Top 5 Campus Objective
 </div>
 </div>

 {/* 4 Seats Dressing Room */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }} className="grid-2-col-mobile">
 {seats.map((member, idx) => {
 const isOwn = member?.uid === user.uid;
 
 return (
 <div 
 key={idx}
 style={{
 background: member ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.005)',
 border: member ? `1.5px solid ${isOwn ? theme.primary : 'rgba(255,255,255,0.08)'}` : '1.5px dashed rgba(255,255,255,0.03)',
 borderRadius: '20px', padding: '18px', display: 'flex', flexDirection: 'column',
 alignItems: 'center', gap: '10px', transition: 'all 0.2s', position: 'relative'
 }}
 >
 {member ? (
 <>
 <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${theme.primary}, #111827)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>
 {member.username[0].toUpperCase()}
 </div>
 <div style={{ textAlign: 'center' }}>
 <div style={{ fontWeight: 800, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
 {member.username} 
 {squad.captain === member.uid && <span title="Captain"></span>}
 </div>
 <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
 {member.goals || 0} goals scored
 </div>
 </div>
 
 <div style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.primary, background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '100px' }}>
 {member.score || 0} pts
 </div>
 </>
 ) : (
 <>
 <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '1.3rem' }}>
 
 </div>
 <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Waiting...</span>
 </>
 )}
 </div>
 );
 })}
 </div>

 {/* Actions */}
 <div style={{ display: 'flex', gap: '12px' }}>
 <button
 onClick={handleShareInvite}
 style={{
 flex: 1, padding: '14px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.15)',
 background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 800, fontSize: '0.9rem',
 cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
 transition: 'background 0.2s'
 }}
 onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
 onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
 >
 <Share2 size={16} /> Invite Friends
 </button>
 
 <button
 onClick={startKickOffFlow}
 disabled={hasPlayedToday}
 style={{
 flex: 1.2, padding: '14px', borderRadius: '100px', border: 'none',
 background: hasPlayedToday ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #10b981, #059669)',
 color: hasPlayedToday ? 'rgba(255,255,255,0.3)' : 'white', fontWeight: 900, fontSize: '0.9rem',
 cursor: hasPlayedToday ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
 boxShadow: hasPlayedToday ? 'none' : '0 6px 18px rgba(16,185,129,0.3)'
 }}
 >
 ⚽ Play Today's Match
 </button>
 </div>
 </div>
 </div>

 {/* Right Side: Messenger-style Chat Room OR Standings */}
 <div style={{ 
 background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', 
 borderRadius: '28px', height: '480px', display: 'flex', flexDirection: 'column',
 overflow: 'hidden'
 }}>
 {/* Tabs bar */}
 <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
 {[
 { id: 'chat', label: 'Dressing Chat' },
 { id: 'leaderboards', label: 'Campus Standings' }
 ].map(tab => (
 <button
 key={tab.id}
 onClick={() => setLobbyTab(tab.id)}
 style={{
 flex: 1, padding: '14px 0', border: 'none', background: 'transparent',
 color: lobbyTab === tab.id ? theme.primary : 'rgba(255,255,255,0.4)',
 fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer',
 borderBottom: lobbyTab === tab.id ? `3px solid ${theme.primary}` : '3px solid transparent',
 transition: 'all 0.2s'
 }}
 >
 {tab.label}
 </button>
 ))}
 </div>

 <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
 
 {/* Lobby Tab: Chat */}
 {lobbyTab === 'chat' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
 <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
 {chatMessages.length === 0 ? (
 <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
 Chat room is empty. Coordinate with your squad!
 </div>
 ) : (
 chatMessages.map(msg => {
 const isOwn = msg.userId === user.uid;
 return (
 <div 
 key={msg.id}
 style={{
 alignSelf: isOwn ? 'flex-end' : 'flex-start',
 maxWidth: '80%',
 display: 'flex',
 flexDirection: 'column',
 alignItems: isOwn ? 'flex-end' : 'flex-start'
 }}
 >
 <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, marginBottom: '2px', padding: '0 4px' }}>
 {msg.username}
 </span>
 <div style={{
 padding: '10px 14px', borderRadius: '14px',
 background: isOwn ? theme.primary : 'rgba(255,255,255,0.04)',
 color: isOwn && theme.primary === '#FEDF00' ? '#000' : 'white',
 border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.06)',
 fontSize: '0.82rem',
 wordBreak: 'break-word',
 borderTopLeftRadius: isOwn ? '14px' : '0px',
 borderTopRightRadius: isOwn ? '0px' : '14px'
 }}>
 {msg.text}
 </div>
 </div>
 );
 })
 )}
 <div ref={chatEndRef} />
 </div>

 <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
 <input
 type="text"
 placeholder="Type dressing message..."
 value={chatInput}
 onChange={e => setChatInput(e.target.value)}
 style={{
 flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
 background: 'rgba(255,255,255,0.02)', color: 'white', outline: 'none', fontSize: '0.8rem'
 }}
 />
 <button
 type="submit"
 style={{
 padding: '10px 14px', borderRadius: '10px', border: 'none', background: theme.primary,
 color: theme.primary === '#FEDF00' ? '#000' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
 }}
 >
 <Send size={14} />
 </button>
 </form>
 </div>
 )}

 {/* Lobby Tab: Leaderboards */}
 {lobbyTab === 'leaderboards' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
 <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '2px', borderRadius: '8px' }}>
 {[
 { id: 'squads', label: 'Squads' },
 { id: 'countries', label: 'Countries' }
 ].map(sub => (
 <button
 key={sub.id}
 onClick={() => setStandingsTab(sub.id)}
 style={{
 flex: 1, padding: '6px 0', border: 'none', cursor: 'pointer', borderRadius: '6px',
 fontWeight: 800, fontSize: '0.72rem', transition: 'all 0.2s',
 background: standingsTab === sub.id ? 'rgba(255,255,255,0.06)' : 'transparent',
 color: standingsTab === sub.id ? theme.primary : 'rgba(255,255,255,0.5)'
 }}
 >
 {sub.label}
 </button>
 ))}
 </div>

 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
 {standingsTab === 'squads' ? (
 standings.squadStandings.map((sq, idx) => {
 const isUserSquad = sq.id === user.worldcupGroupId;
 return (
 <div key={sq.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: isUserSquad ? 'rgba(99,102,241,0.06)' : 'transparent', borderRadius: '10px', border: isUserSquad ? `1px solid ${theme.primary}` : '1px solid transparent', fontSize: '0.8rem' }}>
 <span style={{ width: '22px', fontWeight: 900, color: idx < 3 ? '#FFC107' : 'rgba(255,255,255,0.3)' }}>#{idx + 1}</span>
 <span style={{ flex: 1, fontWeight: 800 }}>{sq.name}</span>
 <strong style={{ color: theme.primary }}>{sq.totalScore || 0} pts</strong>
 </div>
 );
 })
 ) : (
 standings.countryStandings.map((country, idx) => (
 <div key={country.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', fontSize: '0.8rem' }}>
 <span style={{ width: '22px', fontWeight: 900, color: idx < 3 ? '#FFC107' : 'rgba(255,255,255,0.3)' }}>#{idx + 1}</span>
 <span style={{ flex: 1, fontWeight: 800 }}>{country.name}</span>
 <strong style={{ color: theme.primary }}>{country.totalScore} pts</strong>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 </div>
 </div>

 </div>
 <style>{`
 @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
 `}</style>
 </div>
 );
};

export default WorldCupPage;
