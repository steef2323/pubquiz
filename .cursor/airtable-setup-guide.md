# Airtable Setup Guide - Quiz Application

## Overview

You need to create **3 new tables** and **modify 1 existing table** to support:
- Quiz Sessions (tracking when quizzes are played)
- Answer storage with time tracking
- Score calculation with bonus points for speed
- Real-time leaderboards

---

## Step-by-Step Setup Instructions

### 1. Create "Quiz Sessions" Table

**Table Name:** `Quiz Sessions`

**Fields to Create (in order):**

1. **Quiz** (Linked record)
   - Type: Linked record
   - Table: Quiz
   - Options: Allow linking to multiple records: **NO** (one session = one quiz)
   - Description: The quiz being played in this session

2. **Session ID** (Single line text)
   - Type: Single line text
   - Options: Unique values: **YES** (important!)
   - Description: Unique identifier like "quiz-rece04HLPs1W6SA3J-1762524482439-inpcq7h2j"

3. **Host** (Linked record)
   - Type: Linked record
   - Table: Users
   - Options: Allow linking to multiple records: **NO**
   - Description: The user who created/hosts this quiz session

4. **Participants** (Linked record)
   - Type: Linked record
   - Table: Users
   - Options: Allow linking to multiple records: **YES** (multiple participants per session)
   - Description: All users who joined this quiz session

5. **Status** (Single select)
   - Type: Single select
   - Options: 
     - Waiting (default)
     - Active
     - Completed
   - Description: Current state of the quiz session

6. **Started At** (Date)
   - Type: Date
   - Options: Include time: **YES**
   - Description: When the host started the quiz

7. **Ended At** (Date)
   - Type: Date
   - Options: Include time: **YES**
   - Description: When the quiz session ended

---

### 2. Create "Answers" Table

**Table Name:** `Answers`

**Fields to Create (in order):**

1. **Session** (Linked record)
   - Type: Linked record
   - Table: Quiz Sessions
   - Options: Allow linking to multiple records: **NO**
   - Description: The quiz session this answer belongs to

2. **Question** (Linked record)
   - Type: Linked record
   - Table: Questions
   - Options: Allow linking to multiple records: **NO**
   - Description: The question being answered

3. **Participant** (Linked record)
   - Type: Linked record
   - Table: Users
   - Options: Allow linking to multiple records: **NO**
   - Description: The user who submitted this answer

4. **Answer Text** (Single line text)
   - Type: Single line text
   - Description: The answer submitted (e.g., "A", "B", "C", "D" for multiple choice, or "42" for estimation)

5. **Is Correct** (Checkbox)
   - Type: Checkbox
   - Description: Whether the answer is correct (calculated or set when submitted)

6. **Base Points** (Number)
   - Type: Number
   - Options: Format: Integer, Precision: 0
   - Description: Base points for correct answer (e.g., 10 points if correct, 0 if wrong)

7. **Time Bonus** (Number)
   - Type: Number
   - Options: Format: Decimal, Precision: 1
   - Description: Bonus points for answering quickly (calculated based on time taken)

8. **Total Points** (Number)
   - Type: Number
   - Options: Format: Decimal, Precision: 1
   - Description: Base Points + Time Bonus (can be a formula field: `{Base Points} + {Time Bonus}`)

9. **Time Taken** (Number)
   - Type: Number
   - Options: Format: Decimal, Precision: 2
   - Description: Seconds it took to answer (from question display to submission)

10. **Submitted At** (Date)
    - Type: Date
    - Options: Include time: **YES**
    - Description: Exact timestamp when answer was submitted

11. **Question Index** (Number)
    - Type: Number
    - Options: Format: Integer, Precision: 0
    - Description: Which question number this was (0, 1, 2, etc.) - useful for ordering

---

### 3. Create "Scores" Table

**Table Name:** `Scores`

**Fields to Create (in order):**

1. **Session** (Linked record)
   - Type: Linked record
   - Table: Quiz Sessions
   - Options: Allow linking to multiple records: **NO**
   - Description: The quiz session this score belongs to

2. **Participant** (Linked record)
   - Type: Linked record
   - Table: Users
   - Options: Allow linking to multiple records: **NO**
   - Description: The user this score belongs to

3. **Total Score** (Number)
   - Type: Number
   - Options: Format: Decimal, Precision: 1
   - Description: Sum of all points from Answers table for this participant in this session

4. **Questions Answered** (Number)
   - Type: Number
   - Options: Format: Integer, Precision: 0
   - Description: Count of questions answered

5. **Correct Answers** (Number)
   - Type: Number
   - Options: Format: Integer, Precision: 0
   - Description: Count of correct answers

6. **Final Rank** (Number)
   - Type: Number
   - Options: Format: Integer, Precision: 0
   - Description: Final ranking (1st, 2nd, 3rd, etc.) - calculated after quiz ends

7. **Completed At** (Date)
   - Type: Date
   - Options: Include time: **YES**
   - Description: When this participant completed the quiz (answered all questions)

---

### 4. Modify "Users" Table

**Add New Field:**

1. **Quiz Sessions** (Linked record)
   - Type: Linked record
   - Table: Quiz Sessions
   - Options: Allow linking to multiple records: **YES**
   - Description: All quiz sessions this user participated in (as participant or host)

**Note:** Keep existing `Quiz` field - that's for quizzes they CREATED.

---

## Field Relationships Summary

```
Users
├── Quiz (linked) → Quiz table (quizzes CREATED)
└── Quiz Sessions (linked) → Quiz Sessions table (sessions PARTICIPATED)

Quiz Sessions
├── Quiz (linked) → Quiz table
├── Host (linked) → Users table
└── Participants (linked) → Users table (multiple)

Answers
├── Session (linked) → Quiz Sessions table
├── Question (linked) → Questions table
└── Participant (linked) → Users table

Scores
├── Session (linked) → Quiz Sessions table
└── Participant (linked) → Users table
```

---

## Scoring Logic Implementation Notes

### Base Points Calculation:
- **Multiple Choice:** 
  - Correct answer: 10 points
  - Wrong answer: 0 points
- **Estimation:**
  - Exact match: 10 points
  - Within 10%: 8 points
  - Within 25%: 5 points
  - Within 50%: 2 points
  - More than 50% off: 0 points

### Time Bonus Calculation:
- Fastest answer in session: +5 bonus points
- 2nd fastest: +3 bonus points
- 3rd fastest: +2 bonus points
- 4th-10th fastest: +1 bonus point
- Slower than 10th: +0 bonus points

**OR** simpler linear scale:
- Answer within 5 seconds: +5 points
- Answer within 10 seconds: +3 points
- Answer within 20 seconds: +2 points
- Answer within 30 seconds: +1 point
- Answer after 30 seconds: +0 points

---

## Important Notes

1. **Unique Constraints:**
   - Quiz Sessions: Session ID must be unique
   - Answers: Consider making (Session + Question + Participant) unique to prevent duplicate answers (though participants can change answers)

2. **Answer Changes:**
   - If a participant changes their answer, you can either:
     - Update the existing Answer record
     - OR create a new Answer record and mark the old one as "replaced"
   - Recommendation: Update the existing record (simpler)

3. **Real-time Leaderboards:**
   - After each question, calculate scores from Answers table
   - Update Scores table with current Total Score
   - Sort by Total Score descending to get rankings
   - Emit leaderboard via Socket.io

4. **Estimation Answer Comparison:**
   - Store correct answer as number in "Estimation answer" field
   - Compare participant's answer (also number) to correct answer
   - Calculate percentage difference: `|participant - correct| / correct * 100`
   - Apply points based on percentage

---

## Testing Checklist

After creating tables, test:
- [ ] Can create a Quiz Session linked to a Quiz
- [ ] Can link multiple Participants to a Quiz Session
- [ ] Can create an Answer linked to Session, Question, and Participant
- [ ] Can create a Score linked to Session and Participant
- [ ] Can link a User to multiple Quiz Sessions
- [ ] All linked record fields work correctly

---

## Next Steps After Setup

Once tables are created, I'll implement:
1. API routes to create/update Quiz Sessions
2. API routes to save Answers with time tracking
3. Scoring calculation logic (base points + time bonus)
4. Real-time leaderboard updates
5. Visual feedback for answer selection

Let me know when you've created the tables and I'll start implementing!

