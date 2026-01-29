# PA Art Collection Review

Art review tool for Potter Anderson & Corroon's 200th Anniversary collection.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run locally:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Deployment (Netlify)

This project is configured for Netlify with serverless functions.

### Environment Variables

Set these in Netlify Dashboard → Site settings → Environment variables:

| Variable | Description |
|----------|-------------|
| `VITE_PRODUCTION_MODE` | Set to `true` for production |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NOTIFICATION_EMAIL` | Email to receive submissions |
| `SENDGRID_API_KEY` | SendGrid API key for emails |

### How it works

1. Users review art pieces with thumbs up/down/maybe
2. On submit, data is sent to a Netlify serverless function
3. Function uploads any reference images to Cloudinary
4. Function sends email with CSV/JSON attachments
