// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-GGlLu7ZlyIq5AddsZ4XXQP9rg5wd1Mk",
  authDomain: "prediction-43b41.firebaseapp.com",
  databaseURL: "https://prediction-43b41-default-rtdb.firebaseio.com",
  projectId: "prediction-43b41",
  storageBucket: "prediction-43b41.firebasestorage.app",
  messagingSenderId: "1093967509116",
  appId: "1:1093967509116:web:9c9310d59e8b8fb1b3bbf9",
  measurementId: "G-B25RK39ZXB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// API Result Fetching
async function fetchResults() {
  const apiUrl = 'https://api.bdg88zf.com/api/webapi/GetNoaverageEmerdList';
  const requestData = {
    pageSize: 10,
    pageNo: 1,
    typeId: 1,
    language: 0,
    random: "c2505d9138da4e3780b2c2b34f2fb789",
    signature: "7D637E060DA35C0C6E28DC6D23D71BED",
    timestamp: Math.floor(Date.now() / 1000),
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify(requestData),
    });

    if (response.ok) {
      const data = await response.json();
      return data.code === 0 ? data.data.list : null;
    } else return null;
  } catch (error) {
    console.error("API fetch error:", error);
    return null;
  }
}

// Firebase Interaction Functions
// --- Added: Pattern Save Function ---
async function savePatternToFirebase(patternName, sequence, meta = {}) {
  const patternRef = ref(database, 'patterns/' + patternName);
  await set(patternRef, {
    sequence,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    occurrences: 1,
    successRate: meta.successRate || 0,
    confidence: meta.confidence || 0
  });
}

async function saveResultToFirebase(issueNumber, colour, number) {
  const resultsRef = ref(database, 'results/' + issueNumber);
  await set(resultsRef, { issueNumber, colour, number });
}

function doesResultExist(issueNumber) {
  return new Promise(resolve => {
    const resultsRef = ref(database, 'results/' + issueNumber);
    onValue(resultsRef, snap => resolve(snap.exists()), { onlyOnce: true });
  });
}

async function getHistoricalResults(limit = 10) {
  const resultsRef = ref(database, 'results');
  const snapshot = await get(resultsRef);
  if (snapshot.exists()) {
    const results = [];
    snapshot.forEach(childSnapshot => {
      results.push(childSnapshot.val());
    });
    return results.sort((a, b) => b.issueNumber - a.issueNumber).slice(0, limit);
  }
  return [];
}

async function processResults(resultList) {
  for (const result of resultList) {
    const { issueNumber, colour, number } = result;
    const exists = await doesResultExist(issueNumber);
    if (!exists) await saveResultToFirebase(issueNumber, colour, number);
  }
}

// Enhanced Pattern Identification Module with 30+ patterns
function convertToBigSmall(results) {
  return results.map(r => parseInt(r.number) <= 4 ? 'S' : 'B');
}

function identifyPatterns(sequence) {
  const patterns = [];
  const seqStr = sequence.join('');
  
  // Enhanced pattern definitions with 30+ patterns
  const patternDefinitions = [
    // Original patterns
    { name: 'Single Alternating', regex: /^(BS)+B?$|^(SB)+S?$/, confidence: 0.85 },
    { name: 'Double Alternating', regex: /^(BBSS)+B{0,2}S{0,2}$/, confidence: 0.82 },
    { name: 'Triple Alternating', regex: /^(BBBSSS)+B{0,3}S{0,3}$/, confidence: 0.8 },
    { 
      name: 'Mirrored Pattern', 
      test: s => {
        const mid = Math.floor(s.length/2);
        return s.slice(0, mid).join('') === s.slice(mid).reverse().join('');
      }, 
      confidence: 0.78 
    },
    { name: 'Cluster Pattern', regex: /B{3,}S{3,}|S{3,}B{3,}/, confidence: 0.75 },
    { name: 'Mixed Block Pattern', regex: /(BBSBS|SSBSB|BSSBS|SBBSB)/, confidence: 0.7 },
    
    // New IBM-enhanced patterns
    { name: 'Snake Pattern', regex: /BSBBSS/, confidence: 0.77 },
    { 
      name: 'Mirror Cluster', 
      test: s => s.slice(0,4).join('') === 'BBSS' && s.slice(4,8).join('') === 'SSBB', 
      confidence: 0.76 
    },
    { 
      name: 'Hidden Alternating', 
      test: s => {
        let breaks = 0;
        for (let i = 1; i < s.length; i++) {
          if (s[i] === s[i-1]) breaks++;
          if (breaks > 1) return false;
        }
        return breaks === 1;
      }, 
      confidence: 0.75 
    },
    { 
      name: 'Rare Mirror Blocks', 
      test: s => {
        if (s.length < 5) return false;
        const mid = Math.floor(s.length/2);
        return s.slice(0, mid-1).join('') === s.slice(mid+1).reverse().join('');
      }, 
      confidence: 0.72 
    },
    { name: 'U-turn Loop', regex: /BBS.*SSB/, confidence: 0.74 },
    { name: 'Rebound Pattern', regex: /BSSBB?S/, confidence: 0.73 },
    { name: 'Wave Pattern', regex: /BSBSS?BS/, confidence: 0.71 },
    { name: 'Repeating 4-Block', regex: /(BBSS){2,}/, confidence: 0.78 },
    { 
      name: 'Double Pattern Loop', 
      test: s => {
        if (s.length < 6) return false;
        const chunk1 = s.slice(0,3).join('');
        const chunk2 = s.slice(3,6).join('');
        return chunk1 === chunk2;
      }, 
      confidence: 0.75 
    },
    { 
      name: 'Block Rotation', 
      test: s => {
        if (s.length < 6) return false;
        return s.slice(0,3).join('') === 'BSB' && s.slice(3,6).join('') === 'SBS';
      }, 
      confidence: 0.74 
    },
    { name: 'Step Up', regex: /SBBB/, confidence: 0.72 },
    { name: 'Step Down', regex: /BSSS/, confidence: 0.72 },
    { 
      name: 'Asymmetric Mirror', 
      test: s => s.slice(0,3).join('') === 'BSB' && s.slice(3,6).join('') === 'SBS', 
      confidence: 0.73 
    },
    { 
      name: 'Shifted Mirror', 
      test: s => {
        if (s.length < 6) return false;
        const first = s.slice(0,3).join('');
        const second = s.slice(3,6).join('');
        return first[0] === second[2] && first[1] === second[1] && first[2] === second[0];
      }, 
      confidence: 0.71 
    },
    { 
      name: 'Half Mirror', 
      test: s => {
        const half = Math.floor(s.length/2);
        return s.slice(0, half).join('') === s.slice(-half).reverse().join('');
      }, 
      confidence: 0.74 
    },
    { 
      name: 'Random Stabilizer', 
      test: s => {
        if (s.length < 5) return false;
        const lastThree = new Set(s.slice(-3)).size;
        return lastThree === 1;
      }, 
      confidence: 0.7 
    },
    { name: 'Loose Loop', regex: /B{2}S{2}B/, confidence: 0.69 },
    { 
      name: 'Delay Pattern', 
      test: s => {
        if (s.length < 5) return false;
        return new Set(s.slice(0,2)).size === 2 && new Set(s.slice(2)).size === 1;
      }, 
      confidence: 0.68 
    },
    { 
      name: 'Noise Adaptive Pattern', 
      test: s => {
        if (s.length < 6) return false;
        const noise = s.filter((val, idx) => idx > 0 && val !== s[idx-1]).length;
        return noise <= 2;
      }, 
      confidence: 0.72 
    },
    { 
      name: 'Mirror Breaker', 
      test: s => {
        if (s.length < 6) return false;
        const first = s.slice(0,3).join('');
        const second = s.slice(3,6).join('');
        return first[0] === second[2] && first[1] !== second[1] && first[2] === second[0];
      }, 
      confidence: 0.71 
    },
    { 
      name: 'Cluster with Echo', 
      test: s => {
        if (s.length < 6) return false;
        const cluster = s.slice(0,3).every(v => v === 'B') || s.slice(0,3).every(v => v === 'S');
        return cluster && s[3] !== s[4] && s[4] === s[5];
      }, 
      confidence: 0.7 
    },
    { 
      name: 'Broken Loop', 
      test: s => {
        if (s.length < 5) return false;
        const loop = s.slice(0,2).join('');
        return s.slice(2,4).join('') === loop && s[4] !== loop[0];
      }, 
      confidence: 0.69 
    },
    { 
      name: 'Unfinished Pattern', 
      test: s => {
        if (s.length < 4) return false;
        const pattern = s.slice(0,3).join('');
        return s.slice(3).some((v,i) => v !== pattern[i % pattern.length]);
      }, 
      confidence: 0.68 
    },
    { 
      name: 'Trap Pattern', 
      test: s => {
        if (s.length < 5) return false;
        const stable = s.slice(0,3).every(v => v === s[0]);
        return stable && s[3] !== s[4];
      }, 
      confidence: 0.75 
    },
    { 
      name: 'Chameleon Pattern', 
      test: s => {
        if (s.length < 6) return false;
        const first = new Set(s.slice(0,3)).size;
        const last = new Set(s.slice(3)).size;
        return first === 3 && last === 1;
      }, 
      confidence: 0.73 
    }
  ];
  
  // Test sequence against all pattern definitions
  for (const pattern of patternDefinitions) {
    if (pattern.regex && seqStr.match(pattern.regex)) {
      patterns.push({
        type: pattern.name,
        confidence: pattern.confidence
      });
    } else if (pattern.test && pattern.test(sequence)) {
      patterns.push({
        type: pattern.name,
        confidence: pattern.confidence
      });
    }
  }
  
  // Enhanced sub-sequence analysis
  for (let length = 2; length <= 5; length++) {
    const subSequences = {};
    
    for (let i = 0; i <= sequence.length - length; i++) {
      const subSeq = sequence.slice(i, i + length).join('');
      subSequences[subSeq] = (subSequences[subSeq] || 0) + 1;
    }
    
    const entries = Object.entries(subSequences);
    if (entries.length > 0) {
      const [mostFrequent, count] = entries.sort((a, b) => b[1] - a[1])[0];
      
      if (count > 1) {
        patterns.push({
          type: `Repeating ${length}-Block`,
          pattern: mostFrequent,
          occurrences: count,
          confidence: 0.65 + (count/10)
        });
      }
    }
  }
  
  return patterns.sort((a, b) => b.confidence - a.confidence);
}

// Enhanced Break Detection with 17+ break types
function detectBreakPoints(sequence) {
  const breakPoints = [];
  
  if (sequence.length < 5) return breakPoints;
  
  // Original break detection
  const last = sequence[sequence.length - 1];
  const lastThree = sequence.slice(-3);
  const lastFive = sequence.slice(-5);
  
  if (lastThree.every(x => x === lastThree[0])) {
    breakPoints.push({
      type: 'Repeat Break',
      prediction: lastThree[0] === 'B' ? 'S' : 'B',
      confidence: 0.82,
      reasoning: "Breaking a sequence of repeating values"
    });
  }
  
  if (lastFive.join('').match(/BSBSB|SBSBS/)) {
    breakPoints.push({
      type: 'Alternating Pattern Break',
      prediction: last === 'B' ? 'S' : 'B',
      confidence: 0.78,
      reasoning: "Following alternating pattern"
    });
  }
  
  if (sequence.length >= 8) {
    const firstFour = sequence.slice(-8, -4);
    const secondFour = sequence.slice(-4);
    
    if (firstFour.join('') === secondFour.join('')) {
      breakPoints.push({
        type: 'Fake Loop Break',
        prediction: Math.random() > 0.5 ? 'B' : 'S',
        confidence: 0.65,
        reasoning: "Pattern too perfect, may be a trap"
      });
    }
  }
  
  if (sequence.length >= 6) {
    const stable = sequence.slice(-6, -3).every(x => x === sequence.slice(-6, -3)[0]);
    const chaos = new Set(sequence.slice(-3)).size >= 2;
    
    if (stable && chaos) {
      breakPoints.push({
        type: 'Chaos After Stability',
        prediction: sequence.slice(-3).filter(x => x === 'B').length > 1 ? 'S' : 'B',
        confidence: 0.7,
        reasoning: "Pattern shifted from stable to chaotic"
      });
    }
  }
  
  // New IBM-enhanced break detection
  if (sequence.length >= 6) {
    // Double Trap detection
    if (sequence.slice(-4).join('').match(/BSBS|SBSB/) && 
        sequence.slice(-6,-4).join('') === sequence.slice(-4,-2).join('')) {
      breakPoints.push({
        type: 'Double Trap',
        prediction: sequence.slice(-1)[0] === 'B' ? 'S' : 'B',
        confidence: 0.8,
        reasoning: "Double trap pattern detected - likely to reverse"
      });
    }
    
    // Sudden Spike detection
    if (new Set(sequence.slice(-4,-1)).size === 1 && sequence.slice(-1)[0] !== sequence.slice(-2)[0]) {
      breakPoints.push({
        type: 'Sudden Spike',
        prediction: sequence.slice(-1)[0] === 'B' ? 'S' : 'B',
        confidence: 0.78,
        reasoning: "Sudden spike detected after stable pattern"
      });
    }
    
    // Fake Break detection
    if (sequence.length >= 8) {
      const patternBefore = sequence.slice(-8,-4).join('');
      const breakSegment = sequence.slice(-4,-2).join('');
      const patternAfter = sequence.slice(-2).join('');
      
      if (patternBefore === patternAfter && breakSegment !== patternBefore.slice(0,2)) {
        breakPoints.push({
          type: 'Fake Break',
          prediction: patternAfter[0] === 'B' ? 'S' : 'B',
          confidence: 0.75,
          reasoning: "Fake break detected - pattern likely to continue"
        });
      }
    }
    
    // Echo Break detection
    if (sequence.length >= 10) {
      const firstBreak = sequence.slice(-10,-5);
      const secondBreak = sequence.slice(-5);
      
      if (firstBreak.slice(0,3).join('') === secondBreak.slice(0,3).join('') && 
          firstBreak[3] !== secondBreak[3]) {
        breakPoints.push({
          type: 'Echo Break',
          prediction: secondBreak[3] === 'B' ? 'S' : 'B',
          confidence: 0.77,
          reasoning: "Echo break pattern detected"
        });
      }
    }
    
    // Early Stutter detection
    if (new Set(sequence.slice(-5,-3)).size === 1 && 
        new Set(sequence.slice(-3)).size > 1) {
      breakPoints.push({
        type: 'Early Stutter',
        prediction: sequence.slice(-3)[0] === 'B' ? 'S' : 'B',
        confidence: 0.72,
        reasoning: "New pattern failing early"
      });
    }
    
    // Pattern Fade detection
    if (sequence.length >= 9) {
      const first = sequence.slice(-9,-6).join('');
      const middle = sequence.slice(-6,-3).join('');
      const last = sequence.slice(-3).join('');
      
      if (new Set(first).size === 1 && new Set(middle).size === 2 && new Set(last).size === 2) {
        breakPoints.push({
          type: 'Pattern Fade',
          prediction: Math.random() > 0.5 ? 'B' : 'S',
          confidence: 0.68,
          reasoning: "Pattern fading into randomness"
        });
      }
    }
    
    // Mismatch Break detection
    if (sequence.length >= 7) {
      const expectedPattern = sequence.slice(-7,-4).join('');
      const actualPattern = sequence.slice(-4,-1).join('');
      
      if (expectedPattern === actualPattern && sequence.slice(-1)[0] !== expectedPattern[0]) {
        breakPoints.push({
          type: 'Mismatch Break',
          prediction: expectedPattern[0] === 'B' ? 'S' : 'B',
          confidence: 0.76,
          reasoning: "Single mismatch in otherwise stable pattern"
        });
      }
    }
    
    // Trap Loop detection
    if (sequence.slice(-6).join('').match(/(BBSSBB|SSBBSS)/)) {
      breakPoints.push({
        type: 'Trap Loop',
        prediction: sequence.slice(-1)[0] === 'B' ? 'S' : 'B',
        confidence: 0.79,
        reasoning: "Trap loop detected - likely to break"
      });
    }
    
    // Delayed Break detection
    if (sequence.length >= 8) {
      const mainPattern = sequence.slice(-8,-4).join('');
      const delayed = sequence.slice(-4).join('');
      
      if (mainPattern.slice(0,2) === delayed.slice(0,2) && 
          mainPattern.slice(2) !== delayed.slice(2)) {
        breakPoints.push({
          type: 'Delayed Break',
          prediction: delayed.slice(-1)[0] === 'B' ? 'S' : 'B',
          confidence: 0.74,
          reasoning: "Delayed break detected"
        });
      }
    }
    
    // Mirror Fail detection
    if (sequence.length >= 6) {
      const firstHalf = sequence.slice(-6,-3).join('');
      const secondHalf = sequence.slice(-3).join('');
      
      if (firstHalf[0] === secondHalf[2] && firstHalf[1] === secondHalf[1] && 
          firstHalf[2] !== secondHalf[0]) {
        breakPoints.push({
          type: 'Mirror Fail',
          prediction: secondHalf[0] === 'B' ? 'S' : 'B',
          confidence: 0.77,
          reasoning: "Mirror pattern failed to complete"
        });
      }
    }
  }
  
  return breakPoints.sort((a, b) => b.confidence - a.confidence);
}

// Pattern Analysis Module
async function analyzePatternStability(patternName) {
  // Get pattern history from Firebase
  const patternRef = ref(database, 'patterns/' + patternName);
  const snapshot = await get(patternRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    const now = Date.now();
    const patternAge = now - data.createdAt;
    const daysSinceLastSeen = (now - data.lastSeen) / (24 * 60 * 60 * 1000);
    
    // Determine if pattern is old or new
    const isOld = patternAge > 7 * 24 * 60 * 60 * 1000; // Older than 7 days
    
    // Check if pattern recently broke
    const recentlyBroken = daysSinceLastSeen > 2;
    
    // Calculate stability score
    const ageInDays = patternAge / (24 * 60 * 60 * 1000);
    const stabilityScore = data.occurrences / (ageInDays || 1);
    
    return {
      isOld,
      recentlyBroken,
      stabilityScore,
      occurrences: data.occurrences || 0,
      successRate: data.successRate || 0,
      daysSinceLastSeen
    };
  }
  
  return { isNew: true, stabilityScore: 0 };
}

// Intelligent Prediction Module
async function predictNextOutcome(sequence, patterns, breakPoints) {
  // Default prediction (slightly random to avoid predictable behavior)
  let prediction = { 
    value: Math.random() > 0.5 ? 'B' : 'S',
    confidence: 0.5,
    reasoning: "Default random prediction"
  };
  
  // Use break point analysis if available and confident
  if (breakPoints.length > 0 && breakPoints[0].confidence > 0.7) {
    prediction = {
      value: breakPoints[0].prediction,
      confidence: breakPoints[0].confidence,
      reasoning: breakPoints[0].reasoning
    };
  }
  // Otherwise use pattern analysis
  else if (patterns.length > 0 && patterns[0].confidence > 0.65) {
    const topPattern = patterns[0];
    
    // Handle different pattern types
    switch(topPattern.type) {
      case 'Single Alternating':
        prediction = {
          value: sequence[sequence.length - 1] === 'B' ? 'S' : 'B',
          confidence: topPattern.confidence,
          reasoning: "Following single alternating pattern"
        };
        break;
        
      case 'Double Alternating':
        const lastTwo = sequence.slice(-2);
        if (lastTwo.join('') === 'BB') prediction.value = 'S';
        else if (lastTwo.join('') === 'SS') prediction.value = 'B';
        else prediction.value = lastTwo[0];
        
        prediction.confidence = topPattern.confidence;
        prediction.reasoning = "Following double alternating pattern";
        break;
        
      case 'Cluster Pattern':
        const lastCluster = sequence.slice(-3);
        const allSame = lastCluster.every(x => x === lastCluster[0]);
        
        if (allSame) {
          prediction = {
            value: lastCluster[0] === 'B' ? 'S' : 'B',
            confidence: 0.8,
            reasoning: "Breaking long cluster pattern"
          };
        } else {
          prediction = {
            value: lastCluster[0],
            confidence: 0.6,
            reasoning: "Continuing mixed cluster"
          };
        }
        break;
        
      default:
        // For other patterns, use the most common next value
        if (topPattern.pattern) {
          // If we have a specific pattern string, find the next value
          const patternStr = topPattern.pattern;
          const currentEndSequence = sequence.slice(-patternStr.length+1).join('');
          
          for (let i = 0; i < patternStr.length-1; i++) {
            if (patternStr.substring(i, i+currentEndSequence.length) === currentEndSequence) {
              const nextIndex = i + currentEndSequence.length;
              if (nextIndex < patternStr.length) {
                prediction = {
                  value: patternStr[nextIndex],
                  confidence: topPattern.confidence,
                  reasoning: `Following ${topPattern.type} pattern`
                };
              }
            }
          }
        }
    }
  }
  
  // Apply anti-trap logic
  const countB = sequence.slice(-5).filter(x => x === 'B').length;
  const countS = 5 - countB;
  
  // If we've seen too many consecutive same values, adjust confidence
  if (countB >= 4 && prediction.value === 'B') {
    prediction.confidence *= 0.8;
    prediction.reasoning += " (Many recent Bs, confidence reduced)";
  } else if (countS >= 4 && prediction.value === 'S') {
    prediction.confidence *= 0.8;
    prediction.reasoning += " (Many recent Ss, confidence reduced)";
  }
  
  // If pattern is too perfect, it might be a trap
  if (sequence.length >= 8) {
    const tooRegular = sequence.slice(-8).join('').match(/(BS){4}|(SB){4}/);
    if (tooRegular) {
      prediction.confidence *= 0.7;
      prediction.reasoning += " (Pattern suspiciously regular, might be a trap)";
    }
  }
  
  
  if (patterns.length > 0) {
    const patternInfo = await analyzePatternStability(patterns[0].type);
    if (patternInfo.stabilityScore > 0.5 && !patternInfo.recentlyBroken) {
      prediction.confidence += 0.05;
      prediction.reasoning += ` | Pattern reused (stable)`;
    }
  }
return prediction;
}

// Enhanced Results Analysis
async function analyzeResults(results) {
  // Extract numbers from results
  const numbers = results.map(r => parseInt(r.number));
  const numberSet = new Set(numbers);
  
  // Basic statistics
  const missingNumbers = [];
  for (let i = 0; i <= 9; i++) {
    if (!numberSet.has(i)) missingNumbers.push(i);
  }

  const avgMissingNumber = missingNumbers.length > 0 ? 
    (missingNumbers.reduce((a, b) => a + b) / missingNumbers.length) : 0;
  
  // Frequency analysis
  const frequencyNumber = {};
  numbers.forEach(num => frequencyNumber[num] = (frequencyNumber[num] || 0) + 1);
  
  // Consecutive number analysis
  let maxConsecutiveCount = 0, maxConsecutiveNumber = null;
  let currentCount = 0, prevNum = null;
  
  numbers.forEach(num => {
    currentCount = (num === prevNum) ? currentCount + 1 : 1;
    
    if (currentCount > maxConsecutiveCount) {
      maxConsecutiveCount = currentCount;
      maxConsecutiveNumber = num;
    }
    
    prevNum = num;
  });
  
  // Convert to big/small sequence for pattern analysis
  const bigSmallSeq = convertToBigSmall(results);
  
  // Detect patterns in the sequence
  const patterns = identifyPatterns(bigSmallSeq);
  
  // Analyze break points
  const breakPoints = detectBreakPoints(bigSmallSeq);
  
  // Generate prediction
  const prediction = await predictNextOutcome(bigSmallSeq, patterns, breakPoints);
  
  return {
    // Basic statistics
    missingNumbers,
    avgMissingNumber,
    frequencyNumber,
    maxConsecutiveNumber,
    
    // Advanced analysis
    bigSmallSequence: bigSmallSeq,
    patterns,
    breakPoints,
    
    // Prediction
    prediction
  };
}


// ----------- LIVE AI TREND MODULE (Non-Destructive Layer) -----------

function analyzeLiveTrend(results) {
  const sequence = convertToBigSmall(results);
  let streak = 1, maxStreak = 1, lastChar = sequence[0];
  let changes = 0, recentFlip = 0;

  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] === lastChar) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      changes++;
      streak = 1;
      lastChar = sequence[i];
      recentFlip = sequence.length - i;
    }
  }

  const countB = sequence.filter(x => x === 'B').length;
  const countS = sequence.length - countB;
  const dominant = countB > countS ? 'B' : 'S';
  const volatility = changes / (sequence.length - 1);
  const stability = 1 - volatility;

  return {
    dominant,
    maxStreak,
    volatility: parseFloat(volatility.toFixed(2)),
    stability: parseFloat(stability.toFixed(2)),
    lastFlipAgo: recentFlip
  };
}

function predictFromLiveAI(trend) {
  let confidence = 0.5;
  let reasoning = "";
  let value = trend.dominant;

  if (trend.stability > 0.7 && trend.maxStreak >= 3) {
    confidence = 0.85;
    reasoning = "Stable trend with strong streak";
  } else if (trend.volatility > 0.6) {
    confidence = 0.55;
    reasoning = "Unstable trend, high volatility";
    value = Math.random() > 0.5 ? 'B' : 'S';
  } else if (trend.lastFlipAgo <= 2) {
    confidence = 0.6;
    reasoning = "Recent trend shift, weak stability";
  } else {
    confidence = 0.65;
    reasoning = "Moderate trend with no strong pattern";
  }

  return { value, confidence, reasoning };
}


// AI Prediction Function

// ------------------ Confidence-Free Live Pattern AI ------------------
function predictWithoutConfidence(sequence, patterns) {
  // Count pattern matches in last 20 results
  const recent = sequence.slice(-10);
  const patternMatches = patterns.map(p => {
    let logic = () => false;
    if (p.regex) {
      const regex = new RegExp(p.regex.source); // regenerate from string if needed
      logic = r => regex.test(r.join(''));
    }
    const liveCount = recent.slice(0, -5).filter((_, i) => logic(recent.slice(i, i + 5))).length;
    return { name: p.type, liveCount };
  });

  // Select best matching pattern
  const bestPattern = patternMatches.sort((a, b) => b.liveCount - a.liveCount)[0];

  // Subsequence frequency analysis
  const subMap = {};
  for (let i = 0; i < recent.length - 4; i++) {
    const sub = recent.slice(i, i + 4).join('');
    subMap[sub] = (subMap[sub] || 0) + 1;
  }

  let probableNext = 'B';
  let maxFreq = 0;
  for (const [sub, count] of Object.entries(subMap)) {
    if (count > maxFreq) {
      probableNext = sub[3];
      maxFreq = count;
    }
  }

  // Live trend
  const countB = recent.filter(x => x === 'B').length;
  const countS = recent.length - countB;
  const dominant = countB > countS ? 'B' : 'S';

  // Decision logic
  if (bestPattern && bestPattern.liveCount >= 3) {
    return bestPattern.name.includes('Cluster') ? (dominant === 'B' ? 'S' : 'B') : dominant;
  } else {
    return probableNext;
  }
}


// ADVANCED LOGIC-BASED PATTERN ENGINE (30+ Rules, No Confidence)
function logicBasedPrediction(sequence) {
  const seqStr = sequence.join('');
  const last3 = sequence.slice(-3);
  const last5 = sequence.slice(-5);
  const last = sequence[sequence.length - 1];

  const rules = [
    { name: "Strict Alternating", test: () => /(BSBSBS|SBSBSB)$/.test(seqStr), next: last === 'B' ? 'S' : 'B' },
    { name: "Triple Cluster Break", test: () => last3.every(x => x === 'B'), next: 'S' },
    { name: "Triple Cluster Break", test: () => last3.every(x => x === 'S'), next: 'B' },
    { name: "Snake Continuation", test: () => seqStr.endsWith('BSBBSS'), next: 'B' },
    { name: "Repeating End Match", test: () => {
        for (let len = 4; len <= 6; len++) {
          const recent = seqStr.slice(-len);
          if (seqStr.slice(0, -len).includes(recent)) return true;
        }
        return false;
      }, next: last },
    { name: "Mirror 4x", test: () => {
        if (sequence.length < 8) return false;
        return seqStr.slice(-8, -4) === seqStr.slice(-4).split('').reverse().join('');
      }, next: last },
    { name: "Wave Start", test: () => seqStr.match(/BSBSS$/), next: 'B' },
    { name: "Trap Loop", test: () => seqStr.match(/BBSSBB$|SSBBSS$/), next: last === 'B' ? 'S' : 'B' },
    { name: "Loop Flip", test: () => {
        if (sequence.length < 6) return false;
        const a = seqStr.slice(-6, -3);
        const b = seqStr.slice(-3);
        return a[0] === b[2] && a[1] === b[1] && a[2] !== b[0];
      }, next: b[0] === 'B' ? 'S' : 'B' },
    { name: "Echo Repeat", test: () => {
        if (sequence.length < 10) return false;
        const a = sequence.slice(-10,-5).join('');
        const b = sequence.slice(-5).join('');
        return a.slice(0,3) === b.slice(0,3) && a[3] !== b[3];
      }, next: last === 'B' ? 'S' : 'B' },
    { name: "Steady Climb", test: () => seqStr.endsWith('SBBB'), next: 'B' },
    { name: "Steady Drop", test: () => seqStr.endsWith('BSSS'), next: 'S' },
    { name: "False Alternation", test: () => seqStr.match(/(BS){4,}|(SB){4,}/), next: last === 'B' ? 'S' : 'B' },
    { name: "Slow Flip", test: () => {
        if (sequence.length < 6) return false;
        return sequence[0] === sequence[1] && sequence[2] !== sequence[3] && sequence[4] === sequence[5];
      }, next: sequence[5] },
    { name: "Center Trap", test: () => {
        if (sequence.length < 5) return false;
        return sequence[0] === sequence[1] && sequence[2] !== sequence[3] && sequence[3] === sequence[4];
      }, next: sequence[4] },
    { name: "Mirror Cluster", test: () => seqStr.endsWith('BBSS') || seqStr.endsWith('SSBB'), next: last },
    { name: "Delayed Bounce", test: () => {
        if (sequence.length < 6) return false;
        return sequence[0] === sequence[3] && sequence[1] === sequence[4] && sequence[2] !== sequence[5];
      }, next: sequence[5] === 'B' ? 'S' : 'B' }
  ];

  for (let rule of rules) {
    if (rule.test()) {
      return {
        value: rule.next,
        reasoning: "Matched rule: " + rule.name
      };
    }
  }

  // Fallback
  return { value: last === 'B' ? 'S' : 'B', reasoning: "No strong pattern, flipped last value" };
}



async function aiPredict(results) {
  const sequence = convertToBigSmall(results);
  const patterns = identifyPatterns(sequence);

  // Use live behaviour-based prediction
  const predictedValue = predictWithoutConfidence(sequence, patterns);

  const readable = predictedValue === 'B' ? 'Big' : 'Small';
  const reasoning = "Prediction based on live pattern matches, streaks, and subsequence frequency.";

  // Update UI
  const predictionDiv = document.getElementById("predictionResult");
  if (predictionDiv) {
    predictionDiv.textContent = `AI Prediction: ${readable} | Reasoning: ${reasoning}`;
  }

  // Save prediction to Firebase
  const patternLogRef = ref(database, 'patternLogs/' + Date.now());
  await set(patternLogRef, {
    sequence,
    pattern: "Live Behaviour",
    predicted: readable,
    confidence: 1.0,
    reasoning,
    timestamp: Date.now()
  });

  return {
    value: predictedValue,
    confidence: 1.0,
    reasoning
  };
}



// UI Update
async function updateResults(resultList) {
  // Update results table
  const historyTable = document.getElementById('recentResults');
  if (historyTable) {
    historyTable.innerHTML = '';
  }
  
  // Run analysis
  const analysis = await analyzeResults(resultList);
  
  // Update UI with analysis results
  document.getElementById('missingNumbers').textContent = analysis.missingNumbers.join(', ');
  document.getElementById('avgMissingNumber').textContent = analysis.avgMissingNumber.toFixed(2);
  
  const frequencyNumberElement = document.getElementById('frequencyNumber');
  frequencyNumberElement.innerHTML = '';
  
  for (const [number, frequency] of Object.entries(analysis.frequencyNumber)) {
    const listItem = document.createElement('li');
    listItem.textContent = `Number ${number}: ${frequency} times`;
    frequencyNumberElement.appendChild(listItem);
  }
  
  document.getElementById('maxConsecutiveNumber').textContent = analysis.maxConsecutiveNumber;
  
  // Populate patterns if element exists
  const patternsElement = document.getElementById('patterns');
  if (patternsElement) {
    patternsElement.innerHTML = '';
    
    analysis.patterns.forEach(pattern => {
      const listItem = document.createElement('li');
      listItem.textContent = `${pattern.type} (${(pattern.confidence * 100).toFixed(1)}% confidence)`;
      patternsElement.appendChild(listItem);
    });
  }
  
  // Add results to table
  if (historyTable) {
    resultList.forEach(result => {
      const { issueNumber, colour, number } = result;
      const row = document.createElement('tr');
      
      ['issueNumber', 'colour', 'number'].forEach(field => {
        const cell = document.createElement('td');
        cell.textContent = result[field];
        cell.classList.add('px-4', 'py-2');
        row.appendChild(cell);
      });
      
      historyTable.appendChild(row);
    });
  }
  
  // Generate and display prediction
  await aiPredict(resultList);
  determineAIAction(analysis.patterns, analysis.breakPoints);
}

// Main function
async function fetchResultsAndUpdate() {
  const resultList = await fetchResults();
  
  if (resultList) {
    await processResults(resultList);
    await updateResults(resultList);
  } else {
    console.error("Failed to fetch results from API");
  }
}



// ---------------- AI Decision Script Integration ----------------

// 1. Pattern Tracker Module (Real Status Checker)
const patternTracker = {
  isPatternStarting: (patterns) => patterns.length > 0 && patterns[0].confidence >= 0.75,
  isPatternMidway: (patterns) => patterns.length > 0 && patterns[0].confidence >= 0.65 && patterns[0].confidence < 0.75,
  isPatternEndingOrBreaking: (patterns, breakPoints) =>
    breakPoints.length > 0 && breakPoints[0].confidence > 0.7,
  isValidBreakpoint: (breakPoints) => breakPoints.length > 0 && breakPoints[0].confidence > 0.7,
};

// 2. Breakpoint Logic (Transition Detection)
const breakpointLogic = {
  shouldUseBreakpoint: (patternStatus) => {
    return patternStatus === "ending" || patternStatus === "weakStart";
  },
  getFutureInsight: () => {
    return "Future insight based on breakpoint";
  },
  getPatternTrend: () => {
    return "Current pattern trend";
  },
};

// 3. Chart Decision Flow
const chartDecisionFlow = (patternStatus, breakpointTriggered) => {
  switch (patternStatus) {
    case "active":
      if (breakpointTriggered === "no") return "Continue pattern";
      else if (breakpointTriggered === "yes") return "Start monitoring break";
      break;
    case "ending":
      if (breakpointTriggered === "yes-strong") return "Predict reversal";
      else if (breakpointTriggered === "no") return "Random or new pattern forming";
      break;
    case "no-clear-pattern":
      if (breakpointTriggered === "yes") return "Follow breakpoint";
      break;
    default:
      return "No action";
  }
};

// 4. AI Pattern Lifecycle Understanding
const patternLifecycle = {
  start: () => "Pattern started",
  running: () => "Pattern running",
  breaking: () => "Pattern breaking",
  ending: () => "Pattern ending",
};

// 5. Action Recommendation Logic (adds to UI)
function determineAIAction(patterns, breakPoints) {
  let status = "no-clear-pattern";
  let breakpointStatus = "no";

  if (patternTracker.isPatternStarting(patterns)) status = "active";
  else if (patternTracker.isPatternMidway(patterns)) status = "active";
  else if (patternTracker.isPatternEndingOrBreaking(patterns, breakPoints)) status = "ending";

  if (patternTracker.isValidBreakpoint(breakPoints)) {
    breakpointStatus = breakPoints[0].confidence > 0.75 ? "yes-strong" : "yes";
  }

  const action = chartDecisionFlow(status, breakpointStatus);

  const actionDiv = document.getElementById("aiDecision");
  if (actionDiv) {
    let lifecycleStage = "unknown";
    if (patternTracker.isPatternStarting(patterns)) lifecycleStage = patternLifecycle.start();
    else if (patternTracker.isPatternMidway(patterns)) lifecycleStage = patternLifecycle.running();
    else if (patternTracker.isPatternEndingOrBreaking(patterns, breakPoints)) lifecycleStage = patternLifecycle.breaking();
    actionDiv.textContent = "Recommended AI Action: " + action + " | Lifecycle: " + lifecycleStage;
  }
}

// Start application

// Start application
fetchResultsAndUpdate();
setInterval(fetchResultsAndUpdate, 60000);








