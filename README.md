# GatePlay

GatePlay is a thoughtfully curated movie streaming platform prioritizing meaningful storytelling over algorithmic noise. It is built with a flexible Express.js backend and a sleek, modern vanilla frontend.

## Tech Stack
- **Frontend**: HTML5, Vanilla JavaScript, CSS3
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk

## Setup Instructions

### Environment Variables
In development or on Vercel, you need the following environment keys:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5000

DATABASE_URL=your_supabase_pg_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

### Running Locally
1. Clone the repository and navigate into the `gateplay` folder.
2. Run `npm install` to install dependencies.
3. Start the application:
   ```bash
   npm run dev
   ```
4. Access the site at `http://localhost:5000`

### Deploying to Vercel
This project is pre-configured for deployment on Vercel. 
Simply push this codebase to a GitHub repository, connect the repository to Vercel, and Vercel will automatically detect the `.json` configuration file (`vercel.json`) at the root.

**Important:** Make sure to add the necessary Environment Variables directly in your Vercel project settings prior to the build/deployment.

## Features
- **User Authentication**: Secure sign-in and sign-up powered by Clerk.
- **Premium Upgrading**: Smooth membership tier upgrade flows.
- **Movie Catalog**: Beautifully curated dynamic grid with sorting and filtering functionalities.
- **Serverless API**: Configured correctly to deploy seamlessly onto Vercel.
