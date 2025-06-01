import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js ";
import { getDatabase, ref, set, push, onValue, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js ";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-GGlLu7ZlyIq5AddsZ4XXQP9rg5wd1Mk",
  authDomain: "prediction-43b41.firebaseapp.com",
  databaseURL: "https://prediction-43b41-default-rtdb.firebaseio.com ",
  projectId: "prediction-43b41",
  storageBucket: "prediction-43b41.firebasestorage.app",
  messagingSenderId: "1093967509116",
  appId: "1:1093967509116:web:9c9310d59e8b8fb1b3bbf9",
  measurementId: "G-B25RK39ZXB"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Helper Function to Calculate Levenshtein Distance
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Deletion
        matrix[i][j - 1] + 1, // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

// Fetch Results from API
async function fetchResults() {
  const apiUrl = 'https://api.bdg88zf.com/api/webapi/GetNoaverageEmerdList ';
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
    } else {
      console.error("Failed to fetch results:", response.statusText);
      return null;
    }
  } catch (error) {
    console.error("API fetch error:", error);
    return null;
  }
}

// Save Result to Firebase
async function saveResultToFirebase(issueNumber, colour, number) {
  const resultsRef = ref(database, `results/${issueNumber}`);
  await set(resultsRef, { issueNumber, colour, number });
}

// Check if Result Exists in Firebase
function doesResultExist(issueNumber) {
  return new Promise(resolve => {
    const resultsRef = ref(database, `results/${issueNumber}`);
    onValue(resultsRef, snap => resolve(snap.exists()), { onlyOnce: true });
  });
}

// Get Historical Results from Firebase
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

// Process Results and Save to Firebase
async function processResults(resultList) {
  for (const result of resultList) {
    const { issueNumber, colour, number } = result;
    const exists = await doesResultExist(issueNumber);
    if (!exists) await saveResultToFirebase(issueNumber, colour, number);
  }
}

// Convert Numbers to Big/Small Sequence
function convertToBigSmall(results) {
  return results.map(r => parseInt(r.number) <= 4 ? 'S' : 'B');
}

// Identify Patterns in the Sequence
function identifyPatterns(sequence) {
  const patterns = [];
  const seqStr = sequence.join('');

  // Knowledge Graph for Patterns
  const patternKnowledge = {
    'trap': {
      signature: 'repeat-repeat-break',
      examples: ['BBSSB', 'SSBBSSB'],
      reaction: 'avoid trusting the third repeat',
      trust: 0.4
    },
    'wave': {
      signature: 'gradual-buildup-followed-by-sudden-break',
      examples: ['BBBSS', 'SSSBB'],
      reaction: 'mark as potential wave',
      trust: 0.5
    },
    'rebound': {
      signature: 'gradual-buildup-followed-by-sudden-rebound',
      examples: ['BBBSB', 'SSSSB'],
      reaction: 'mark as potential rebound',
      trust: 0.6
    },
    'mirror': {
      signature: 'first-half-matches-reversed-second-half',
      examples: ['BBSSB'],
      reaction: 'mark as mirror pattern',
      trust: 0.9
    },
    'cluster': {
      signature: 'three-or-more-consecutive-same-values',
      examples: ['BBB', 'SSS'],
      reaction: 'mark as cluster pattern',
      trust: 0.75
    },
    'alternating': {
      signature: 'alternating-values',
      examples: ['BSBSB', 'SBSBS'],
      reaction: 'mark as alternating pattern',
      trust: 0.85
    },
    'emerging': {
      signature: 'starting-with-known-pattern',
      examples: ['BBB', 'BBS', 'BSB', 'SSB'],
      reaction: 'mark as emerging pattern',
      trust: 0.6
    }
  };

  // Smart Pattern Recognition
  function smartPatternRecognition(sequence, knowledgeBase) {
    for (const [type, patternObj] of Object.entries(knowledgeBase)) {
      if (sequence.includes(patternObj.signature)) {
        patterns.push({
          type,
          reason: patternObj.reaction,
          confidence: patternObj.trust
        });
      }
    }
  }

  // Logical Pattern Matching
  if (seqStr.includes('BBBSS') || seqStr.includes('SSSBB')) {
    patterns.push({
      type: 'Wave Pattern',
      confidence: 0.71,
      reason: 'Gradual buildup followed by sudden break'
    });
  }

  if (seqStr.includes('BBBSB') || seqStr.includes('SSSSB')) {
    patterns.push({
      type: 'Rebound Pattern',
      confidence: 0.73,
      reason: 'Gradual buildup followed by sudden rebound'
    });
  }

  if (seqStr.includes('BBSSB') || seqStr.includes('SSBBSSB')) {
    patterns.push({
      type: 'Trap Pattern',
      confidence: 0.7,
      reason: '2x repeat block then break'
    });
  }

  // Memory and Emotion Engine
  const memory = {};
  for (let i = 0; i <= sequence.length - 3; i++) {
    const chunk = sequence.slice(i, i + 3).join('');
    memory[chunk] = (memory[chunk] || 0) + 1;
  }

  for (const [chunk, count] of Object.entries(memory)) {
    if (count >= 2) {
      patterns.push({
        type: 'Comeback Pattern',
        pattern: chunk,
        confidence: 0.8,
        reason: `Pattern "${chunk}" appeared ${count} times`
      });
    }
  }

  // Mirror Pattern Detection
  const mid = Math.floor(sequence.length / 2);
  const left = sequence.slice(0, mid).join('');
  const right = sequence.slice(mid).reverse().join('');
  if (left === right) {
    patterns.push({
      type: 'Mirror Pattern',
      confidence: 0.9,
      reason: 'First half matches reversed second half'
    });
  }

  // Cluster Pattern Detection
  const clusterPattern = /B{3,}|S{3,}/;
  if (clusterPattern.test(seqStr)) {
    patterns.push({
      type: 'Cluster Pattern',
      confidence: 0.75,
      reason: 'Three or more consecutive same values'
    });
  }

  // Alternating Pattern Detection
  const alternatingPattern = /BSBSB|SBSBS/;
  if (alternatingPattern.test(seqStr)) {
    patterns.push({
      type: 'Alternating Pattern',
      confidence: 0.85,
      reason: 'Alternating values'
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

// Detect Traps in the Sequence
function detectTraps(sequence) {
  const traps = [];
  if (sequence.length < 6) return traps;

  // Detect overly perfect loops
  if (sequence.length >= 8) {
    const firstFour = sequence.slice(-8, -4).join('');
    const secondFour = sequence.slice(-4).join('');
    if (firstFour === secondFour) {
      traps.push({
        type: 'Perfect Loop Trap',
        prediction: sequence[sequence.length - 1] === 'B' ? 'S' : 'B',
        confidence: 0.85,
        reasoning: "Pattern too perfect, likely a trap"
      });
    }
  }

  // Detect suspiciously regular patterns
  if (sequence.length >= 6) {
    const stable = sequence.slice(-6, -3).every(x => x === sequence.slice(-6, -3)[0]);
    const chaos = new Set(sequence.slice(-3)).size >= 2;
    if (stable && chaos) {
      traps.push({
        type: 'Chaos After Stability Trap',
        prediction: sequence.slice(-3).filter(x => x === 'B').length > 1 ? 'S' : 'B',
        confidence: 0.8,
        reasoning: "Pattern shifted from stable to chaotic, likely a trap"
      });
    }
  }

  // Detect double traps
  if (sequence.length >= 6) {
    if (sequence.slice(-4).join('').match(/BSBS|SBSB/) &&
        sequence.slice(-6, -4).join('') === sequence.slice(-4, -2).join('')) {
      traps.push({
        type: 'Double Trap',
        prediction: sequence[sequence.length - 1] === 'B' ? 'S' : 'B',
        confidence: 0.85,
        reasoning: "Double trap pattern detected - likely to reverse"
      });
    }
  }

  return traps.sort((a, b) => b.confidence - a.confidence);
}

// Predict Next Outcome
async function predictNextOutcome(sequence, patterns, traps) {
  let prediction = {
    value: null,
    confidence: 0.5,
    reasoning: "Default prediction pending analysis"
  };

  // Multi-Pattern Weighting
  const topPatterns = patterns.slice(0, 3);
  const weightedPrediction = { B: 0, S: 0, confidence: 0 };

  for (const pattern of topPatterns) {
    switch (pattern.type) {
      case 'Wave Pattern':
        const nextValue = sequence[sequence.length - 1] === 'B' ? 'S' : 'B';
        weightedPrediction[nextValue] += pattern.confidence;
        break;
      case 'Rebound Pattern':
        const lastTwo = sequence.slice(-2);
        if (lastTwo.join('') === 'BB') weightedPrediction['S'] += pattern.confidence;
        else if (lastTwo.join('') === 'SS') weightedPrediction['B'] += pattern.confidence;
        else weightedPrediction[lastTwo[0]] += pattern.confidence;
        break;
      default:
        if (pattern.pattern) {
          const patternStr = pattern.pattern;
          const currentEndSequence = sequence.slice(-patternStr.length).join('');
          if (patternStr.startsWith(currentEndSequence)) {
            const nextIndex = currentEndSequence.length;
            if (nextIndex < patternStr.length) {
              weightedPrediction[patternStr[nextIndex]] += pattern.confidence;
            }
          }
        }
    }
  }

  const totalConfidence = weightedPrediction.B + weightedPrediction.S;
  if (totalConfidence > 0) {
    prediction.value = weightedPrediction.B > weightedPrediction.S ? 'B' : 'S';
    prediction.confidence = Math.max(weightedPrediction.B, weightedPrediction.S) / totalConfidence;
    prediction.reasoning = "Weighted multi-pattern decision";
  }

  // Prioritize Traps
  if (traps.length > 0 && traps[0].confidence > 0.7) {
    prediction = {
      value: traps[0].prediction,
      confidence: traps[0].confidence,
      reasoning: traps[0].reasoning
    };
  }

  // Micro-pattern Analysis
  const microPatterns = {};
  for (let i = 0; i <= sequence.length - 3; i++) {
    const chunk = sequence.slice(i, i + 3).join('');
    microPatterns[chunk] = (microPatterns[chunk] || 0) + 1;
  }

  const topMicroPattern = Object.keys(microPatterns).reduce((a, b) =>
    microPatterns[a] > microPatterns[b] ? a : b
  );

  if (microPatterns[topMicroPattern] >= 2) {
    const nextChar = topMicroPattern[2];
    prediction.value = nextChar;
    prediction.confidence *= 1.1; // Increase confidence slightly
    prediction.reasoning += ` | Micro-pattern detected: ${topMicroPattern}`;
  }

  // Fuzzy Matching (Near Pattern)
  const fuzzyMatchThreshold = 2;
  for (const pattern of patterns) {
    if (pattern.pattern) {
      const distance = levenshteinDistance(sequence.slice(-pattern.pattern.length), pattern.pattern);
      if (distance <= fuzzyMatchThreshold) {
        prediction.value = pattern.pattern[pattern.pattern.length - 1];
        prediction.confidence = pattern.confidence * (1 - distance / fuzzyMatchThreshold);
        prediction.reasoning += ` | Fuzzy match with ${pattern.type}`;
        break;
      }
    }
  }

  // Adjust confidence based on recent trends
  const countB = sequence.slice(-5).filter(x => x === 'B').length;
  const countS = 5 - countB;
  if (countB >= 4 && prediction.value === 'B') {
    prediction.confidence *= 0.8;
    prediction.reasoning += " | Many recent Bs, confidence reduced";
  } else if (countS >= 4 && prediction.value === 'S') {
    prediction.confidence *= 0.8;
    prediction.reasoning += " | Many recent Ss, confidence reduced";
  }

  // Check for suspiciously regular patterns
  if (sequence.length >= 8) {
    const tooRegular = sequence.slice(-8).join('').match(/(BS){4}|(SB){4}/);
    if (tooRegular) {
      prediction.confidence *= 0.7;
      prediction.reasoning += " | Pattern suspiciously regular, might be a trap";
    }
  }

  return prediction;
}

// Analyze Results
async function analyzeResults(results) {
  const numbers = results.map(r => parseInt(r.number));
  const bigSmallSeq = convertToBigSmall(results);
  const patterns = identifyPatterns(bigSmallSeq);
  const traps = detectTraps(bigSmallSeq); // New trap detection
  const prediction = await predictNextOutcome(bigSmallSeq, patterns, traps);

  return {
    missingNumbers: getMissingNumbers(numbers),
    avgMissingNumber: calculateAverage(getMissingNumbers(numbers)),
    frequencyNumber: calculateFrequency(numbers),
    maxConsecutiveNumber: findMaxConsecutive(numbers),
    bigSmallSequence: bigSmallSeq,
    patterns,
    traps,
    prediction
  };
}

// Helper Functions
function getMissingNumbers(numbers) {
  const numberSet = new Set(numbers);
  const missingNumbers = [];
  for (let i = 0; i <= 9; i++) {
    if (!numberSet.has(i)) missingNumbers.push(i);
  }
  return missingNumbers;
}

function calculateAverage(numbers) {
  return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
}

function calculateFrequency(numbers) {
  const frequency = {};
  numbers.forEach(num => frequency[num] = (frequency[num] || 0) + 1);
  return frequency;
}

function findMaxConsecutive(numbers) {
  let maxCount = 0, currentCount = 0, prevNum = null, maxConsecutiveNumber = null;
  numbers.forEach(num => {
    currentCount = (num === prevNum) ? currentCount + 1 : 1;
    if (currentCount > maxCount) {
      maxCount = currentCount;
      maxConsecutiveNumber = num;
    }
    prevNum = num;
  });
  return maxConsecutiveNumber;
}

// AI Prediction
async function aiPredict(results) {
  try {
    const bigSmallSeq = convertToBigSmall(results);
    const patterns = identifyPatterns(bigSmallSeq);
    const traps = detectTraps(bigSmallSeq); // New trap detection
    const prediction = await predictNextOutcome(bigSmallSeq, patterns, traps);

    const patternName = patterns.length > 0 ? patterns[0].type : "No clear pattern";
    const readable = prediction.value === 'B' ? 'Big' : 'Small';

    const predictionDiv = document.getElementById("predictionResult");
    if (predictionDiv) {
      predictionDiv.textContent = `AI Prediction: ${readable} (${(prediction.confidence * 100).toFixed(1)}% confidence) | Pattern: ${patternName} | Reasoning: ${prediction.reasoning}`;
    }

    const patternLogRef = ref(database, `patternLogs/${Date.now()}`);
    await set(patternLogRef, {
      sequence: bigSmallSeq,
      pattern: patternName,
      predicted: readable,
      confidence: prediction.confidence,
      reasoning: prediction.reasoning,
      timestamp: Date.now()
    });

    if (patterns.length > 0 && patterns[0].confidence > 0.7) {
      const patternRef = ref(database, `patterns/${patterns[0].type}`);
      const snapshot = await get(patternRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        await set(patternRef, {
          ...data,
          sequence: bigSmallSeq,
          lastSeen: Date.now(),
          occurrences: (data.occurrences || 0) + 1
        });
      } else {
        await set(patternRef, {
          sequence: bigSmallSeq,
          createdAt: Date.now(),
          lastSeen: Date.now(),
          occurrences: 1,
          confidence: patterns[0].confidence,
          successRate: 0
        });
      }
    }
  } catch (e) {
    console.error("AI prediction error", e);
  }
}

// Update Results in UI
async function updateResults(resultList) {
  const historyTable = document.getElementById('recentResults');
  if (historyTable) {
    historyTable.innerHTML = '';
  }

  const analysis = await analyzeResults(resultList);

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

  const patternsElement = document.getElementById('patterns');
  if (patternsElement) {
    patternsElement.innerHTML = '';
    analysis.patterns.forEach(pattern => {
      const listItem = document.createElement('li');
      listItem.textContent = `${pattern.type} (${(pattern.confidence * 100).toFixed(1)}% confidence) - ${pattern.reason}`;
      patternsElement.appendChild(listItem);
    });
  }

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

  await aiPredict(resultList);
}

// Fetch Results and Update UI
async function fetchResultsAndUpdate() {
  const predictionDiv = document.getElementById('predictionResult');
  if (predictionDiv) {
    predictionDiv.textContent = "AI analyzing... please wait";
  }

  const resultList = await fetchResults();

  if (resultList) {
    const limitedList = resultList.slice(0, 10); // Limit results to 10 for analysis
    setTimeout(async () => {
      await updateResults(limitedList);
    }, 300); // slight delay to allow DOM to paint
  } else {
    console.error("Failed to fetch results from API");
    if (predictionDiv) {
      predictionDiv.textContent = "Failed to fetch results.";
    }
  }
}

fetchResultsAndUpdate();
setInterval(fetchResultsAndUpdate, 60000);

