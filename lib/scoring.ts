// Scoring logic for quiz answers

export interface ScoringResult {
  isCorrect: boolean;
  basePoints: number;
  timeBonus: number;
  totalPoints: number;
}

/**
 * Calculate base points for an answer
 */
export function calculateBasePoints(
  answerType: 'multiple choice' | 'estimation',
  participantAnswer: string | number,
  correctAnswer: string | number
): { isCorrect: boolean; basePoints: number } {
  if (answerType === 'multiple choice') {
    // Multiple choice: exact match = 10 points, wrong = 0 points
    const isCorrect = String(participantAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase();
    return {
      isCorrect,
      basePoints: isCorrect ? 10 : 0,
    };
  } else {
    // Estimation: points based on closeness
    const participantNum = typeof participantAnswer === 'string' ? parseFloat(participantAnswer) : participantAnswer;
    const correctNum = typeof correctAnswer === 'string' ? parseFloat(String(correctAnswer)) : correctAnswer;
    
    if (isNaN(participantNum) || isNaN(correctNum) || correctNum === 0) {
      return { isCorrect: false, basePoints: 0 };
    }
    
    // Calculate percentage difference
    const difference = Math.abs(participantNum - correctNum);
    const percentageDiff = (difference / Math.abs(correctNum)) * 100;
    
    let basePoints = 0;
    let isCorrect = false;
    
    if (percentageDiff === 0) {
      // Exact match
      basePoints = 10;
      isCorrect = true;
    } else if (percentageDiff <= 10) {
      // Within 10%
      basePoints = 8;
      isCorrect = true;
    } else if (percentageDiff <= 25) {
      // Within 25%
      basePoints = 5;
      isCorrect = true;
    } else if (percentageDiff <= 50) {
      // Within 50%
      basePoints = 2;
      isCorrect = true;
    } else {
      // More than 50% off
      basePoints = 0;
      isCorrect = false;
    }
    
    return { isCorrect, basePoints };
  }
}

/**
 * Calculate time bonus based on relative ranking
 * Fastest answer gets +5, 2nd fastest +3, 3rd fastest +2, 4th-10th +1, others +0
 */
export function calculateTimeBonus(
  timeTaken: number,
  allTimes: number[]
): number {
  // Sort times ascending (fastest first)
  const sortedTimes = [...allTimes].sort((a, b) => a - b);
  
  // Find the rank of this time (1-based)
  const rank = sortedTimes.indexOf(timeTaken) + 1;
  
  if (rank === 1) {
    return 5; // Fastest
  } else if (rank === 2) {
    return 3; // 2nd fastest
  } else if (rank === 3) {
    return 2; // 3rd fastest
  } else if (rank >= 4 && rank <= 10) {
    return 1; // 4th-10th fastest
  } else {
    return 0; // Slower than 10th
  }
}

/**
 * Calculate total scoring result
 * Time bonus is only given for correct answers
 */
export function calculateScore(
  answerType: 'multiple choice' | 'estimation',
  participantAnswer: string | number,
  correctAnswer: string | number,
  timeTaken: number,
  allTimes: number[],
  allCorrectTimes?: number[] // Only times from correct answers for time bonus calculation
): ScoringResult {
  const { isCorrect, basePoints } = calculateBasePoints(
    answerType,
    participantAnswer,
    correctAnswer
  );
  
  // Time bonus is only given for correct answers
  // Only calculate time bonus if answer is correct, and use only correct answer times
  let timeBonus = 0;
  if (isCorrect && allCorrectTimes && allCorrectTimes.length > 0) {
    timeBonus = calculateTimeBonus(timeTaken, allCorrectTimes);
  }
  
  const totalPoints = basePoints + timeBonus;
  
  return {
    isCorrect,
    basePoints,
    timeBonus,
    totalPoints,
  };
}

