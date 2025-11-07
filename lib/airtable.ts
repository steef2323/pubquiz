import Airtable from 'airtable';

// Initialize Airtable with base ID
const baseId = process.env.AIRTABLE_BASE_ID || 'appy4uBo89IidbgYL';

// Lazy initialization of Airtable client
let airtableConfigured = false;

function configureAirtable() {
  if (!airtableConfigured) {
    const apiKey = process.env.AIRTABLE_API_KEY;
    if (!apiKey) {
      throw new Error('AIRTABLE_API_KEY environment variable is required');
    }
    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: apiKey,
    });
    airtableConfigured = true;
  }
}

export function getBase() {
  configureAirtable();
  return Airtable.base(baseId);
}

// Table names
export const TABLES = {
  USERS: 'Users',
  QUIZ: 'Quiz',
  QUESTIONS: 'Questions',
  QUIZ_SESSIONS: 'Quiz session',
  ANSWERS: 'Answers',
  SCORES: 'Scores',
} as const;

// Type definitions for Airtable records
export interface UserRecord {
  id?: string;
  fields: {
    Name: string;
    Email: string;
    Password: string;
    Role?: string;
    Quiz?: string[]; // Linked record IDs (quizzes CREATED)
    'Quiz session host'?: string[]; // Linked record IDs (sessions HOSTED)
    'Quiz session participant'?: string[]; // Linked record IDs (sessions PARTICIPATED)
    Answers?: string[]; // Linked record IDs
    Scores?: string[]; // Linked record IDs
  };
}

export interface QuizRecord {
  id?: string;
  fields: {
    Number?: number;
    Name?: string;
    Users?: string[]; // Linked record IDs
    Questions?: string[]; // Linked record IDs
    'Quiz session'?: string[]; // Linked record IDs
  };
}

export interface QuestionRecord {
  id?: string;
  fields: {
    Name?: string; // Auto-generated name field
    'Question name'?: string; // Single line text field for question name
    'Question text'?: string;
    'Question answer A'?: string;
    'Question answer B'?: string;
    'Question answer C'?: string;
    'Question answer D'?: string;
    'Estimation answer'?: string; // For estimation type questions (deprecated - use "Correct answer" instead)
    'Correct answer'?: string; // Can be "A", "B", "C", "D" for multiple choice, or a number for estimation
    Image?: Array<{ url: string; filename?: string }>; // Attachment field
    Video?: Array<{ url: string; filename?: string }>; // Attachment field
    'Question type'?: string; // Text, Image, Video (case-sensitive)
    'Answer type'?: string; // Multiple choice, Estimation (case-sensitive)
    Quiz?: string[]; // Linked record IDs
    Answers?: string[]; // Linked record IDs
    Order?: number; // For drag-and-drop ordering
  };
}

export interface QuizSessionRecord {
  id?: string;
  fields: {
    Name?: string; // Auto-generated name field
    Quiz?: string[]; // Linked record IDs (single)
    'Session ID'?: string; // Unique session identifier
    Host?: string[]; // Linked record IDs (single)
    Participants?: string[]; // Linked record IDs (multiple)
    Status?: string; // Waiting, Active, Completed
    'Started at'?: string; // Date with time
    'Ended at'?: string; // Date with time
    Answers?: string[]; // Linked record IDs
    Scores?: string[]; // Linked record IDs
  };
}

export interface AnswerRecord {
  id?: string;
  fields: {
    Name?: string; // Auto-generated name field
    Session?: string[]; // Linked record IDs (single)
    Question?: string[]; // Linked record IDs (single)
    Participant?: string[]; // Linked record IDs (single)
    'Answer text'?: string; // The answer submitted
    'Is Correct'?: boolean; // Checkbox
    'Base points'?: number; // Integer
    'Time bonus'?: number; // Decimal
    'Total points'?: number; // Decimal (computed/formula field - read-only, calculated as Base points + Time bonus)
    'Time taken'?: number; // Decimal (seconds)
    'Submitted at'?: string; // Date with time
    'Question index'?: number; // Integer (0, 1, 2, etc.)
  };
}

export interface ScoreRecord {
  id?: string;
  fields: {
    Name?: string; // Auto-generated name field
    Session?: string[]; // Linked record IDs (single)
    Participant?: string[]; // Linked record IDs (single)
    'Total score'?: number; // Decimal
    'Questions answered'?: number; // Integer
    'Correct answers'?: number; // Integer
    'Final rank'?: number; // Integer (1st, 2nd, 3rd, etc.)
    'Completed at'?: string; // Date with time
  };
}

// Helper functions for common operations
export async function createUser(userData: Omit<UserRecord['fields'], 'Quiz'>): Promise<UserRecord> {
  const record = await getBase()(TABLES.USERS).create([
    {
      fields: userData as any, // Airtable's FieldSet type is complex, using any for flexibility
    },
  ]);
  return record[0] as unknown as UserRecord;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const records = await getBase()(TABLES.USERS)
    .select({
      filterByFormula: `{Email} = "${email}"`,
      maxRecords: 1,
    })
    .firstPage();
  
  if (records.length === 0) return null;
  
  return records[0] as unknown as UserRecord;
}

export async function createQuiz(quizData: QuizRecord['fields']): Promise<QuizRecord> {
  const record = await getBase()(TABLES.QUIZ).create([
    {
      fields: quizData as any, // Airtable's FieldSet type is complex, using any for flexibility
    },
  ]);
  return record[0] as unknown as QuizRecord;
}

export async function updateQuiz(quizId: string, quizData: Partial<QuizRecord['fields']>): Promise<QuizRecord> {
  const record = await getBase()(TABLES.QUIZ).update([
    {
      id: quizId,
      fields: quizData as any, // Airtable's FieldSet type is complex, using any for flexibility
    },
  ]);
  return record[0] as unknown as QuizRecord;
}

export async function createQuestion(questionData: QuestionRecord['fields']): Promise<QuestionRecord> {
  const record = await getBase()(TABLES.QUESTIONS).create([
    {
      fields: questionData as any, // Airtable's FieldSet type is complex, using any for flexibility
    },
  ]);
  return record[0] as unknown as QuestionRecord;
}

export async function updateQuestion(questionId: string, questionData: Partial<QuestionRecord['fields']>): Promise<QuestionRecord> {
  // Log the Image field if present to debug attachment issues
  if (questionData.Image) {
    console.log('[updateQuestion] Image field being sent to Airtable:', {
      isArray: Array.isArray(questionData.Image),
      length: Array.isArray(questionData.Image) ? questionData.Image.length : 'N/A',
      firstItem: Array.isArray(questionData.Image) ? questionData.Image[0] : 'N/A',
      fullData: JSON.stringify(questionData.Image),
    });
  }
  
  const record = await getBase()(TABLES.QUESTIONS).update([
    {
      id: questionId,
      fields: questionData as any, // Airtable's FieldSet type is complex, using any for flexibility
    },
  ]);
  
  const updatedRecord = record[0] as unknown as QuestionRecord;
  
  // Log what Airtable returned
  if (updatedRecord.fields?.Image) {
    console.log('[updateQuestion] Image field returned from Airtable:', {
      isArray: Array.isArray(updatedRecord.fields.Image),
      length: Array.isArray(updatedRecord.fields.Image) ? updatedRecord.fields.Image.length : 'N/A',
      firstItem: Array.isArray(updatedRecord.fields.Image) ? updatedRecord.fields.Image[0] : 'N/A',
    });
  } else {
    console.log('[updateQuestion] No Image field returned from Airtable');
  }
  
  return updatedRecord;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await getBase()(TABLES.QUESTIONS).destroy([questionId]);
}

export async function getQuizById(quizId: string): Promise<QuizRecord | null> {
  try {
    const record = await getBase()(TABLES.QUIZ).find(quizId);
    return record as unknown as QuizRecord;
  } catch (error) {
    return null;
  }
}

export async function getQuestionsByQuizId(quizId: string): Promise<QuestionRecord[]> {
  console.log(`[getQuestionsByQuizId] Searching for questions for quizId: ${quizId}`);
  
  try {
    // Fetch all questions and filter in code - more reliable than Airtable formulas
    const allRecords = await getBase()(TABLES.QUESTIONS)
      .select()
      .all();
    
    console.log(`[getQuestionsByQuizId] Fetched ${allRecords.length} total questions from Airtable`);
    
    const quizQuestions = allRecords
      .filter((record: any) => {
        const quizLinks = record.fields?.Quiz || [];
        const quizLinksArray = Array.isArray(quizLinks) ? quizLinks : [];
        
        // Log each question's quiz links for debugging
        if (allRecords.length <= 20) { // Only log if not too many records
          console.log(`[getQuestionsByQuizId] Question ${record.id} (${record.fields?.['Question text']?.substring(0, 30) || 'no text'}) has quiz links:`, quizLinksArray);
        }
        
        const isMatch = quizLinksArray.includes(quizId);
        if (isMatch) {
          console.log(`[getQuestionsByQuizId] ✓ Found matching question: ${record.id}`);
        }
        
        return isMatch;
      })
      .sort((a: any, b: any) => {
        // Sort by Order field if available, otherwise by record ID
        const orderA = a.fields?.Order ?? null;
        const orderB = b.fields?.Order ?? null;
        
        if (orderA !== null && orderB !== null) {
          return orderA - orderB;
        }
        
        // Fallback: sort by record ID (lexicographically)
        return (a.id || '').localeCompare(b.id || '');
      })
      .map((record: any) => record as unknown as QuestionRecord);
    
    console.log(`[getQuestionsByQuizId] Found ${quizQuestions.length} questions for quiz ${quizId}`);
    return quizQuestions;
  } catch (error) {
    console.error('[getQuestionsByQuizId] Error fetching questions:', error);
    return [];
  }
}

export async function getUserQuizzes(userId: string): Promise<QuizRecord[]> {
  console.log(`[getUserQuizzes] Searching for quizzes for userId: ${userId}`);
  
  try {
    // Fetch all quizzes and filter in code - more reliable than Airtable formulas
    const allRecords = await getBase()(TABLES.QUIZ)
      .select()
      .all();
    
    console.log(`[getUserQuizzes] Fetched ${allRecords.length} total quizzes from Airtable`);
    
    const userQuizzes = allRecords
      .filter((record: any) => {
        const users = record.fields?.Users || [];
        const usersArray = Array.isArray(users) ? users : [];
        
        // Log each quiz's users for debugging
        if (allRecords.length <= 10) { // Only log if not too many records
          console.log(`[getUserQuizzes] Quiz ${record.id} (${record.fields?.Name || 'unnamed'}) has users:`, usersArray);
        }
        
        const isMatch = usersArray.includes(userId);
        if (isMatch) {
          console.log(`[getUserQuizzes] ✓ Found matching quiz: ${record.id} (${record.fields?.Name || 'unnamed'})`);
        }
        
        return isMatch;
      })
      .map((record: any) => record as unknown as QuizRecord);
    
    console.log(`[getUserQuizzes] Found ${userQuizzes.length} quizzes for user ${userId}`);
    return userQuizzes;
  } catch (error) {
    console.error('[getUserQuizzes] Error fetching user quizzes:', error);
    return [];
  }
}

// Quiz Session functions
export async function createQuizSession(sessionData: QuizSessionRecord['fields']): Promise<QuizSessionRecord> {
  const record = await getBase()(TABLES.QUIZ_SESSIONS).create([
    {
      fields: sessionData as any,
    },
  ]);
  return record[0] as unknown as QuizSessionRecord;
}

export async function getQuizSessionBySessionId(sessionId: string): Promise<QuizSessionRecord | null> {
  try {
    const records = await getBase()(TABLES.QUIZ_SESSIONS)
      .select({
        filterByFormula: `{Session ID} = "${sessionId}"`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) return null;
    return records[0] as unknown as QuizSessionRecord;
  } catch (error) {
    console.error('[getQuizSessionBySessionId] Error:', error);
    return null;
  }
}

export async function updateQuizSession(sessionId: string, sessionData: Partial<QuizSessionRecord['fields']>): Promise<QuizSessionRecord> {
  // First find the session by Session ID
  const session = await getQuizSessionBySessionId(sessionId);
  if (!session || !session.id) {
    throw new Error('Quiz session not found');
  }
  
  const record = await getBase()(TABLES.QUIZ_SESSIONS).update([
    {
      id: session.id,
      fields: sessionData as any,
    },
  ]);
  return record[0] as unknown as QuizSessionRecord;
}

// Answer functions
export async function createAnswer(answerData: AnswerRecord['fields']): Promise<AnswerRecord> {
  const record = await getBase()(TABLES.ANSWERS).create([
    {
      fields: answerData as any,
    },
  ]);
  return record[0] as unknown as AnswerRecord;
}

export async function updateAnswer(answerId: string, answerData: Partial<AnswerRecord['fields']>): Promise<AnswerRecord> {
  const record = await getBase()(TABLES.ANSWERS).update([
    {
      id: answerId,
      fields: answerData as any,
    },
  ]);
  return record[0] as unknown as AnswerRecord;
}

export async function getAnswerBySessionQuestionParticipant(
  sessionId: string,
  questionId: string,
  participantId: string
): Promise<AnswerRecord | null> {
  try {
    // First get the session record ID
    const session = await getQuizSessionBySessionId(sessionId);
    if (!session || !session.id) return null;
    
    // Fetch all answers and filter in code
    const allRecords = await getBase()(TABLES.ANSWERS)
      .select()
      .all();
    
    const answer = allRecords.find((record: any) => {
      const sessionLinks = Array.isArray(record.fields?.Session) ? record.fields.Session : [];
      const questionLinks = Array.isArray(record.fields?.Question) ? record.fields.Question : [];
      const participantLinks = Array.isArray(record.fields?.Participant) ? record.fields.Participant : [];
      
      return sessionLinks.includes(session.id) &&
             questionLinks.includes(questionId) &&
             participantLinks.includes(participantId);
    });
    
    return answer ? (answer as unknown as AnswerRecord) : null;
  } catch (error) {
    console.error('[getAnswerBySessionQuestionParticipant] Error:', error);
    return null;
  }
}

export async function getAnswersBySession(sessionId: string): Promise<AnswerRecord[]> {
  try {
    const session = await getQuizSessionBySessionId(sessionId);
    if (!session || !session.id) return [];
    
    const allRecords = await getBase()(TABLES.ANSWERS)
      .select()
      .all();
    
    return allRecords
      .filter((record: any) => {
        const sessionLinks = Array.isArray(record.fields?.Session) ? record.fields.Session : [];
        return sessionLinks.includes(session.id);
      })
      .map((record: any) => record as unknown as AnswerRecord);
  } catch (error) {
    console.error('[getAnswersBySession] Error:', error);
    return [];
  }
}

// Score functions
export async function createScore(scoreData: ScoreRecord['fields']): Promise<ScoreRecord> {
  const record = await getBase()(TABLES.SCORES).create([
    {
      fields: scoreData as any,
    },
  ]);
  return record[0] as unknown as ScoreRecord;
}

export async function updateScore(scoreId: string, scoreData: Partial<ScoreRecord['fields']>): Promise<ScoreRecord> {
  const record = await getBase()(TABLES.SCORES).update([
    {
      id: scoreId,
      fields: scoreData as any,
    },
  ]);
  return record[0] as unknown as ScoreRecord;
}

export async function getScoreBySessionParticipant(
  sessionId: string,
  participantId: string
): Promise<ScoreRecord | null> {
  try {
    const session = await getQuizSessionBySessionId(sessionId);
    if (!session || !session.id) return null;
    
    const allRecords = await getBase()(TABLES.SCORES)
      .select()
      .all();
    
    const score = allRecords.find((record: any) => {
      const sessionLinks = Array.isArray(record.fields?.Session) ? record.fields.Session : [];
      const participantLinks = Array.isArray(record.fields?.Participant) ? record.fields.Participant : [];
      
      return sessionLinks.includes(session.id) && participantLinks.includes(participantId);
    });
    
    return score ? (score as unknown as ScoreRecord) : null;
  } catch (error) {
    console.error('[getScoreBySessionParticipant] Error:', error);
    return null;
  }
}

export async function getScoresBySession(sessionId: string): Promise<ScoreRecord[]> {
  try {
    const session = await getQuizSessionBySessionId(sessionId);
    if (!session || !session.id) return [];
    
    const allRecords = await getBase()(TABLES.SCORES)
      .select()
      .all();
    
    return allRecords
      .filter((record: any) => {
        const sessionLinks = Array.isArray(record.fields?.Session) ? record.fields.Session : [];
        return sessionLinks.includes(session.id);
      })
      .map((record: any) => record as unknown as ScoreRecord);
  } catch (error) {
    console.error('[getScoresBySession] Error:', error);
    return [];
  }
}
