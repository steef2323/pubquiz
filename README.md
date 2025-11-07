# Pub Quiz Website

A fun, party-themed website for creating and hosting pub quizzes with real-time participation!

## Features

- 🎉 Party-themed UI with disco ball animations and confetti
- 📝 Create custom quizzes with text, image, and video questions
- 🎯 Multiple question formats (multiple choice, estimation)
- 📱 QR code-based quiz participation
- 🏆 Real-time leaderboards
- 💾 Auto-save to Airtable

## Setup

### Prerequisites

- Node.js 18+ and npm
- Airtable account with a base set up
- Airtable API key

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=appy4uBo89IidbgYL
# Optional: For production image uploads (see Deployment section)
# BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Testing Airtable Connection

Visit `http://localhost:3000/api/test-airtable` to test your Airtable connection.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Airtable** - Database backend
- **Custom CSS** - Party theme with animations

## Project Structure

```
├── app/              # Next.js app directory (pages, layouts, API routes)
├── components/       # React components
├── lib/              # Utility functions (Airtable client, etc.)
├── styles/           # Global styles (globals.css)
├── utils/            # Helper functions
└── public/           # Static assets
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Airtable Schema

### Tables:
- **Users**: Name, Email, Password, Role, Quiz (linked)
- **Quiz**: Number, Name, Users (linked), Questions (linked)
- **Questions**: Name, Question text, Image, Video, Question type, Answer type, Question answer A/B/C...

## Deployment to Vercel

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket

### Deployment Steps

1. **Connect Repository to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Vercel will auto-detect Next.js settings

2. **Set Environment Variables**:
   In your Vercel project settings, add these environment variables:
   ```
   AIRTABLE_API_KEY=your_airtable_api_key_here
   AIRTABLE_BASE_ID=appy4uBo89IidbgYL
   ```

3. **Set Up Vercel Blob Storage** (for image uploads):
   - In your Vercel project dashboard, go to **Storage** tab
   - Click **Create Database** → Select **Blob**
   - Name it (e.g., "quiz-images") and create it
   - This automatically creates `BLOB_READ_WRITE_TOKEN` environment variable
   - **Important**: Redeploy your app after creating the Blob store

4. **Deploy**:
   - Vercel will automatically deploy on every push to your main branch
   - Or click **Deploy** in the dashboard

### Image Uploads

**How it works:**
- **Development (localhost)**: Images save to `/public/uploads/` (not accessible to Airtable)
- **Production (Vercel)**: Images upload to Vercel Blob Storage and get public URLs that Airtable can access

**Important**: 
- Airtable requires publicly accessible URLs for image attachments
- In development, images won't save to Airtable (localhost URLs aren't accessible)
- In production on Vercel, images automatically work because Vercel Blob provides public URLs

## License

MIT

