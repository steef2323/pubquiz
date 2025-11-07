# Pub Quiz Website - Project Plan

## Background and Motivation

Building a comprehensive pub quiz website that allows users to:
- Create custom quizzes with multiple question types (text, image, video)
- Support multiple question formats (multiple choice, estimation)
- Host live quizzes with real-time participation via QR codes
- Track scores and display leaderboards
- Provide a fun, party-themed UI with disco ball, confetti, and colorful design

## Key Challenges and Analysis

### Technical Challenges:
1. **Real-time Synchronization**: Need real-time updates for quiz participation, answer submissions, and leaderboard updates
   - Solution: Use WebSockets (Socket.io) or Server-Sent Events for real-time communication
   
2. **Airtable Integration**: 
   - Need to establish connection and handle CRUD operations
   - Tables: Users, Questions, Quiz, Answers (likely needed)
   - Linked records between Quiz-Questions, Quiz-Users, User-Answers
   
3. **File Uploads**: Image and video questions require file storage
   - Solution: Use Airtable attachments (confirmed by user)
   
4. **QR Code Generation**: Dynamic QR codes for quiz sessions
   - Solution: Generate unique session IDs, create QR codes linking to participant view
   
5. **State Management**: Complex state for quiz flow, participants, answers, scoring
   - Solution: React Context or state management library (Zustand/Redux)

### Architecture Decisions:
- **Frontend**: Next.js (React) for SSR/SSG capabilities and routing
- **Backend**: Next.js API routes or separate Node.js/Express server
- **Real-time**: Socket.io for WebSocket connections
- **Styling**: CSS Modules or Tailwind CSS with global theme file
- **Airtable**: Official Airtable API client
- **Authentication**: Simple session-based auth or JWT tokens

### Airtable Schema (Confirmed):
- **Base ID**: `appy4uBo89IidbgYL`
- **Users Table**: 
  - Fields: Name, Email, Password (hashed), Role, Quiz (linked to Quiz table)
- **Quiz Table**:
  - Fields: Number, Name, Users (linked to Users), Questions (linked to Questions)
- **Questions Table**:
  - Fields: Name, Question text, Image (attachment), Video (attachment), Question type, Answer type, Question answer A, Question answer B, Question answer C (and more as needed)
  - Note: Quiz link field will be added to link questions to quiz
- **Quiz Sessions Table** (to be created):
  - Fields: Quiz (linked), Session ID, QR Code, Status, Started At, Ended At
- **Participants Table** (to be created):
  - Fields: Session (linked), User (linked), Joined At
- **Answers Table** (to be created):
  - Fields: Session (linked), Question (linked), Participant (linked), Answer Text/Value, Is Correct, Submitted At

## High-level Task Breakdown

### Phase 1: Project Setup & Foundation
**Task 1.1: Initialize Next.js Project**
- Success Criteria: Next.js app running locally, basic folder structure created
- Actions:
  - Initialize Next.js with TypeScript
  - Set up project structure (components, pages, styles, utils, lib)
  - Install base dependencies

**Task 1.2: Create Global Styling System**
- Success Criteria: Global CSS file with party theme, reusable design tokens
- Actions:
  - Create global stylesheet with disco ball animations, confetti effects
  - Define color palette (vibrant, party colors)
  - Set high border-radius values
  - Define font family variable
  - Create reusable utility classes

**Task 1.3: Set Up Airtable Connection**
- Success Criteria: Can read/write to Airtable base
- Actions:
  - Install Airtable SDK
  - Create Airtable client utility
  - Set up environment variables for API key and base ID
  - Test connection with simple read/write operations

### Phase 2: Authentication & User Management
**Task 2.1: Build Homepage**
- Success Criteria: Homepage displays with "Generate Pubquiz" and "Log In" buttons, matches design theme
- Actions:
  - Create homepage component
  - Style with party theme
  - Add navigation/routing logic

**Task 2.2: Build Registration Flow**
- Success Criteria: User can register with email/name/password, data saves to Airtable Users table
- Actions:
  - Create registration form component
  - Add form validation
  - Create API route to handle registration
  - Implement Airtable user creation
  - Hash passwords before storing
  - Handle success/error states

**Task 2.3: Implement Login System**
- Success Criteria: Users can log in, session maintained, protected routes work
- Actions:
  - Create login form
  - Create API route for authentication
  - Implement session management (cookies/JWT)
  - Create auth context/provider
  - Add protected route wrapper

### Phase 3: Quiz Creation
**Task 3.1: Build Question Creation Interface**
- Success Criteria: User can add questions, select type (text/image/video) and format (multiple choice/estimation)
- Actions:
  - Create question form component
  - Add question type selector
  - Add format selector
  - Create dynamic form fields based on selections
  - Add "+" button to add new questions
  - Implement question list/management UI

**Task 3.2: Implement Auto-save to Airtable**
- Success Criteria: Questions auto-save to Airtable Questions table as user creates them
- Success Criteria: Questions are linked to quiz (or draft quiz)
- Actions:
  - Create API route for question creation
  - Implement debounced auto-save
  - Handle draft quiz creation if needed
  - Link questions to quiz record

**Task 3.3: Handle Media Uploads**
- Success Criteria: Users can upload images/videos, files stored and referenced in Airtable
- Actions:
  - Set up file upload handling (API route)
  - Integrate with Airtable attachments or cloud storage
  - Update question form to handle file uploads
  - Display preview of uploaded media

**Task 3.0: Create Quiz Record on Entry**
- Success Criteria: Quiz record created in Airtable when user enters quiz creation interface
- Actions:
  - Create API route for quiz creation
  - Create quiz record immediately when user navigates to quiz creation page
  - Link quiz to creator (user)
  - Store quiz ID in component state for linking questions

**Task 3.4: Implement Quiz Save**
- Success Criteria: Clicking "Save" updates Quiz record, marks as complete
- Actions:
  - Update quiz record status/name if needed
  - Handle success state and navigation to overview

### Phase 4: Quiz Overview & Management
**Task 4.1: Build Quiz Overview Page**
- Success Criteria: User sees all their quizzes, can click to start
- Actions:
  - Create overview page component
  - Fetch user's quizzes from Airtable
  - Display quiz cards/list
  - Add "Start" button for each quiz
  - Style with party theme

### Phase 5: Real-time Quiz Hosting
**Task 5.1: Set Up WebSocket/Real-time Infrastructure**
- Success Criteria: Real-time connection established, can send/receive messages
- Actions:
  - Install Socket.io (or choose alternative)
  - Set up Socket.io server
  - Create Socket.io client connection
  - Test basic message passing

**Task 5.2: Implement QR Code Generation**
- Success Criteria: Unique QR code generated for each quiz session, links to participant view
- Actions:
  - Install QR code library
  - Generate unique session ID
  - Create QR code with participant URL
  - Display QR code on host screen

**Task 5.3: Build Participant Join Flow**
- Success Criteria: Participants can scan QR, enter name, join quiz session
- Actions:
  - Create participant join page
  - Create participant user records in Airtable
  - Link participants to session
  - Emit join events via WebSocket
  - Display joined participants on host screen

**Task 5.4: Build Host Waiting Screen**
- Success Criteria: Host sees count and names of joined participants, can start quiz
- Actions:
  - Create host waiting screen component
  - Listen for participant join events
  - Display participant list
  - Add "Start Quiz" button
  - Emit start event when clicked

**Task 5.5: Implement Question Display System**
- Success Criteria: Questions appear one by one on host screen with media, answer options
- Actions:
  - Create question display component
  - Handle different question types (text/image/video)
  - Display answer options for multiple choice
  - Implement question progression logic
  - Sync question display via WebSocket

**Task 5.6: Build Participant Answer Interface**
- Success Criteria: Participants see questions and answer options, can submit answers
- Actions:
  - Create participant answer component
  - Display question and options
  - Handle answer submission
  - Emit answer events via WebSocket
  - Save answers to Airtable

**Task 5.7: Implement Answer Tracking & Scoring**
- Success Criteria: Answers recorded, scores calculated, leaderboard updates
- Actions:
  - Create API route to save answers
  - Implement scoring logic
  - Calculate leaderboard
  - Emit leaderboard updates via WebSocket

**Task 5.8: Build Leaderboard Components**
- Success Criteria: Leaderboard displays after questions, updates in real-time
- Actions:
  - Create leaderboard component
  - Display scores and rankings
  - Add party-themed styling
  - Show intermediate and final leaderboards

**Task 5.9: Implement Quiz End Flow**
- Success Criteria: Final leaderboard shown, confetti/celebration effects, quiz marked as ended
- Actions:
  - Create end screen component
  - Trigger confetti animations
  - Display final leaderboard
  - Update quiz status in Airtable
  - Handle cleanup

## Project Status Board

### Phase 1: Project Setup & Foundation
- [x] Task 1.1: Initialize Next.js Project
- [x] Task 1.2: Create Global Styling System
- [x] Task 1.3: Set Up Airtable Connection

### Phase 2: Authentication & User Management
- [x] Task 2.1: Build Homepage
- [x] Task 2.2: Build Registration Flow
- [x] Task 2.3: Implement Login System

### Phase 3: Quiz Creation
- [ ] Task 3.0: Create Quiz Record on Entry
- [ ] Task 3.1: Build Question Creation Interface
- [ ] Task 3.2: Implement Auto-save to Airtable
- [ ] Task 3.3: Handle Media Uploads
- [ ] Task 3.4: Implement Quiz Save

### Phase 4: Quiz Overview & Management
- [x] Task 4.1: Build Quiz Overview Page

### Phase 5: Real-time Quiz Hosting
- [ ] Task 5.1: Set Up WebSocket/Real-time Infrastructure
- [ ] Task 5.2: Implement QR Code Generation
- [ ] Task 5.3: Build Participant Join Flow
- [ ] Task 5.4: Build Host Waiting Screen
- [ ] Task 5.5: Implement Question Display System
- [ ] Task 5.6: Build Participant Answer Interface
- [ ] Task 5.7: Implement Answer Tracking & Scoring
- [ ] Task 5.8: Build Leaderboard Components
- [ ] Task 5.9: Implement Quiz End Flow

## Current Status / Progress Tracking

**Current Phase**: Phase 4 Complete - Moving to Phase 5

**Latest Update**: 
- ✅ Phase 1-3 Complete: Setup, authentication, quiz creation with auto-save
- ✅ Fixed: Multiple quiz creation issue (useRef guard)
- ✅ Fixed: Question saving with correct case-sensitive values ("Text"/"Image"/"Video", "Multiple choice"/"Estimation")
- ✅ Implemented: File uploads for images/videos to Airtable attachments
- ✅ Task 4.1: Quiz overview page - displays all user quizzes with Start/Edit buttons

**Next Steps**: Phase 5 - Real-time Quiz Hosting (WebSocket setup, QR codes, live participation)

**Current Work**: Planning architecture for answer storage, scoring, and user-quiz linking. See `.cursor/architecture-plan.md` for detailed proposal.

## Executor's Feedback or Assistance Requests

### User Decisions Confirmed:
1. **Airtable Base ID**: `appy4uBo89IidbgYL` ✅
2. **Quiz Creation Timing**: Create quiz immediately when user enters quiz creation interface ✅
3. **Media Storage**: Use Airtable attachments ✅
4. **Answer Storage**: Real-time saves to Airtable ✅
5. **Tech Stack**: Next.js + TypeScript ✅

### Field Names from Airtable (Confirmed):
- **Users**: Name, Email, Password, Role, Quiz (linked)
- **Quiz**: Number, Name, Users (linked), Questions (linked)
- **Questions**: Name, Question text, Image, Video, Question type, Answer type, Question answer A/B/C...

## Lessons

- **Airtable Initialization**: Airtable client should be initialized lazily (only when needed) to avoid build-time errors when API keys are not available. Use a `getBase()` function that configures Airtable on first call rather than at module load time.
- **Airtable Types**: Airtable's FieldSet type is complex and strict. For flexibility with dynamic schemas, use `as any` type assertion when passing fields to create/update operations, while maintaining TypeScript interfaces for our application logic.
- **Environment Variables**: Always use lazy initialization for services that require environment variables to prevent build failures during static generation.
- **React ESLint**: Use `&apos;` or escape apostrophes in JSX text to avoid ESLint warnings about unescaped entities.
- **Password Security**: Always hash passwords with bcrypt before storing in database. Never store plain text passwords.
- **JWT Tokens**: Use JWT for session management. Store JWT_SECRET in environment variables. For production, use httpOnly cookies instead of localStorage for better security.

