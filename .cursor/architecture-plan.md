# Quiz Application - Architecture Planning

## Current State Analysis

### Existing Airtable Tables:
1. **Users Table**
   - Fields: Name, Email, Password, Role, Quiz (linked)
   - Current: "Quiz" field links creators to quizzes they created
   - Issue: Participants are also Users, but not linked to quizzes they participate in

2. **Quiz Table**
   - Fields: Number, Name, Users (linked), Questions (linked)
   - Current: Links to creator users and questions

3. **Questions Table**
   - Fields: Question name, Question text, Image, Video, Question type, Answer type, Question answer A/B/C/D, Estimation answer, Quiz (linked), Order
   - Current: Has correct answers stored

### Missing:
- Quiz Sessions (when a quiz is actually played)
- Participant-Quiz linking (separate from creator linking)
- Answer storage (what participants answered)
- Score calculation and storage
- Leaderboard data

---

## Proposed Architecture

### Option 1: Separate Fields for Creators vs Participants (Recommended)

**Users Table - Add Fields:**
- Keep existing: `Quiz` (linked) - for quizzes they CREATED
- Add new: `Participated Quizzes` (linked) - for quizzes they PARTICIPATED in
- Keep: `Role` (Creator, Participant, or both)

**Pros:**
- Simple, clear separation
- Easy to query "quizzes I created" vs "quizzes I participated in"
- No new tables needed

**Cons:**
- Two linked fields in same table
- Participants need to be linked when they join a session

---

### Option 2: Quiz Sessions Table (More Scalable)

**New Table: Quiz Sessions**
- `Quiz` (linked to Quiz table)
- `Session ID` (single line text) - unique identifier
- `Started At` (date/time)
- `Ended At` (date/time)
- `Status` (single select: Waiting, Active, Completed)
- `Host` (linked to Users) - the creator/host
- `Participants` (linked to Users, multiple) - all participants in this session

**Users Table - Modify:**
- Keep: `Quiz` (linked) - quizzes CREATED
- Add: `Quiz Sessions` (linked) - sessions they PARTICIPATED in (via Quiz Sessions table)

**Pros:**
- Tracks actual quiz sessions (one quiz can have multiple sessions)
- Can see history: "I played this quiz 3 times"
- Better for analytics
- Separates quiz template from quiz instances

**Cons:**
- More complex
- Need to create session records

---

### Option 3: Hybrid Approach (Best of Both)

**New Table: Quiz Sessions**
- `Quiz` (linked)
- `Session ID` (single line text)
- `Started At` (date/time)
- `Ended At` (date/time)
- `Status` (single select)
- `Host` (linked to Users)

**Users Table:**
- Keep: `Quiz` (linked) - quizzes CREATED
- Add: `Quiz Sessions` (linked) - sessions participated in

**New Table: Session Participants** (junction table)
- `Session` (linked to Quiz Sessions)
- `User` (linked to Users)
- `Joined At` (date/time)
- `Final Score` (number)
- `Final Rank` (number)

**Pros:**
- Most flexible
- Can track multiple sessions per quiz
- Can store session-specific data (score, rank) per participant
- Clean separation of concerns

**Cons:**
- Most complex
- More tables to manage

---

## Answer Storage Architecture

### Option A: Single Answers Table

**New Table: Answers**
- `Session` (linked to Quiz Sessions)
- `Question` (linked to Questions)
- `Participant` (linked to Users)
- `Answer Text` (single line text) - what they answered (e.g., "A", "B", or "42")
- `Is Correct` (checkbox) - calculated or set when answer is submitted
- `Points` (number) - points awarded for this answer
- `Submitted At` (date/time)
- `Time Taken` (number) - seconds to answer (optional)

**Pros:**
- Simple, one table for all answers
- Easy to query all answers for a session
- Easy to calculate scores

**Cons:**
- One record per answer (could be many records)
- Need to calculate scores on-the-fly

---

### Option B: Answers + Scores Tables

**New Table: Answers** (same as Option A)

**New Table: Scores**
- `Session` (linked to Quiz Sessions)
- `Participant` (linked to Users)
- `Total Score` (number)
- `Questions Answered` (number)
- `Correct Answers` (number)
- `Final Rank` (number) - calculated after quiz ends
- `Completed At` (date/time)

**Pros:**
- Pre-calculated scores (faster leaderboards)
- Can update scores incrementally
- Better for analytics

**Cons:**
- Two tables to maintain
- Need to keep in sync

---

## Scoring Logic

### Multiple Choice Questions:
- Compare participant's answer (A, B, C, D) to correct answer
- Points: 1 point if correct, 0 if incorrect
- Or: Configurable points per question

### Estimation Questions:
- Compare participant's number to correct answer
- Points based on how close they are:
  - Exact match: Full points (e.g., 10 points)
  - Within 10%: 8 points
  - Within 25%: 5 points
  - Within 50%: 2 points
  - More than 50% off: 0 points
- Or: Simple exact match only

---

## Visual Feedback - UI Only (No Database Changes)

### Participant Answer Selection:
- When clicking an answer option, highlight it with:
  - Background color change (accent color)
  - Border glow effect
  - Scale animation
- Selected answer should be visually distinct

### After Submission:
- Show confirmation (already implemented)
- Could show: "Your answer: A" in a highlighted box
- Don't show if it's correct yet (wait for host to reveal)

### After Host Shows Answers:
- Show correct answer highlighted in green
- Show participant's answer:
  - Green if correct
  - Red if incorrect
- Show points earned

---

## Recommended Architecture (My Suggestion)

### Tables Structure:

1. **Users Table** (existing, modify)
   - Keep: Name, Email, Password, Role, Quiz (linked - for creators)
   - Add: Quiz Sessions (linked - for participants)

2. **Quiz Table** (existing, no changes needed)
   - Number, Name, Users (linked), Questions (linked)

3. **Questions Table** (existing, no changes needed)
   - All current fields

4. **Quiz Sessions Table** (NEW)
   - `Quiz` (linked to Quiz)
   - `Session ID` (single line text) - unique, e.g., "quiz-{quizId}-{timestamp}-{random}"
   - `Started At` (date/time)
   - `Ended At` (date/time)
   - `Status` (single select: Waiting, Active, Completed)
   - `Host` (linked to Users) - the creator

5. **Answers Table** (NEW)
   - `Session` (linked to Quiz Sessions)
   - `Question` (linked to Questions)
   - `Participant` (linked to Users)
   - `Answer Text` (single line text) - "A", "B", "42", etc.
   - `Is Correct` (checkbox)
   - `Points` (number)
   - `Submitted At` (date/time)

6. **Scores Table** (NEW - optional but recommended)
   - `Session` (linked to Quiz Sessions)
   - `Participant` (linked to Users)
   - `Total Score` (number)
   - `Questions Answered` (number)
   - `Correct Answers` (number)
   - `Final Rank` (number)
   - `Completed At` (date/time)

### Linking Strategy:

**When Participant Joins:**
1. Create/update Quiz Session record
2. Link Participant to Quiz Session (via Quiz Sessions.Participants field OR via Scores table)
3. Store participant ID in localStorage (already done)

**When Answer is Submitted:**
1. Create Answer record with Session, Question, Participant, Answer Text
2. Calculate Is Correct and Points
3. Update Scores table (increment Total Score, Questions Answered, Correct Answers)

**When Quiz Ends:**
1. Calculate Final Rank for all participants in Scores table
2. Update Quiz Session Status to "Completed"

---

## Questions to Decide: ✅ DECIDED

1. **Scoring for Estimation:** ✅ Points based on closeness
   - Exact match: 10 points
   - Within 10%: 8 points
   - Within 25%: 5 points
   - Within 50%: 2 points
   - More than 50% off: 0 points

2. **Points System:** ✅ All questions worth same points (10 base points)

3. **Time Tracking:** ✅ Yes, bonus points for faster answers
   - Fastest: +5 bonus
   - 2nd fastest: +3 bonus
   - 3rd fastest: +2 bonus
   - 4th-10th: +1 bonus
   - Slower: +0 bonus

4. **Multiple Attempts:** ✅ Yes, participants can change answer before submitting

5. **Leaderboard Updates:** ✅ Real-time after each question

---

## Implementation Priority:

1. **Phase 1: Visual Feedback** (UI only, quick win)
   - Highlight selected answer
   - Show submission confirmation

2. **Phase 2: Quiz Sessions Table**
   - Create table in Airtable
   - Create session when host starts quiz
   - Link participants to session

3. **Phase 3: Answers Table**
   - Create table in Airtable
   - Save answers when submitted
   - Calculate correctness

4. **Phase 4: Scores & Leaderboards**
   - Create Scores table
   - Calculate and display leaderboards
   - Show intermediate and final results

---

## My Recommendation:

**Go with Option 2 (Quiz Sessions Table) + Answers Table + Scores Table**

This gives you:
- ✅ Clear separation: creators vs participants
- ✅ Session tracking (one quiz can be played multiple times)
- ✅ Answer history
- ✅ Pre-calculated scores for fast leaderboards
- ✅ Analytics potential (see all sessions for a quiz)

**Visual Feedback:**
- Highlight selected answer immediately (CSS state)
- Show confirmation after submission
- Show correct/incorrect after host reveals answers

What do you think? Should we go with this approach, or do you prefer a different option?

