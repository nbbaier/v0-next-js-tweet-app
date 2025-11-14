# Delete Functionality Setup

The delete button functionality has been configured and requires the following setup:

## 1. Server-side Configuration (✅ COMPLETED)

The `.env.local` file has been created with the required `TWEET_API_SECRET` environment variable.

**Important:** If deploying to Vercel, you must add this environment variable to your Vercel project settings:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add: `TWEET_API_SECRET=Slldt/UDhGhoUIRyS/sVTpZAvLStvPrYY1GC0iA/t0Y=`
4. Redeploy your application

## 2. Client-side Configuration (⚠️ USER ACTION REQUIRED)

To use the delete button, you must save the API secret in your browser:

1. **Start the development server:**
   ```bash
   pnpm dev
   ```

2. **Open the app in your browser** (usually http://localhost:3000)

3. **Click the key icon (🔑) in the header** - This opens the "Manage API Secret" dialog

4. **Enter the API secret:**
   ```
   Slldt/UDhGhoUIRyS/sVTpZAvLStvPrYY1GC0iA/t0Y=
   ```

5. **Check "Remember secret in this browser"** and click **"Save Secret"**

6. **The key icon should show a green checkmark** (✅) indicating the secret is saved

## 3. Using the Delete Button

Once the API secret is saved:

1. Find any tweet in your feed
2. Click the trash icon (🗑️) button next to it
3. Confirm the deletion in the dialog
4. The tweet will be removed immediately

## Troubleshooting

### "API secret not configured on server"
- The server environment variable is missing
- Make sure `.env.local` exists with `TWEET_API_SECRET`
- Restart your development server

### "Invalid or missing API secret"
- You haven't saved the secret in your browser yet
- Click the key icon in the header and save the secret
- Make sure you're using the exact secret (no extra spaces)

### "No API secret found"
- The secret is not in localStorage
- Use the API Secret Dialog (key icon) to save it

## Security Notes

- The API secret is stored locally in your browser's localStorage
- Each user/browser needs to save the secret individually
- Never commit `.env.local` to version control (it's already in `.gitignore`)
- If sharing this app, share the API secret securely with authorized users only

## Next Steps

After setting up the API secret in your browser, the delete functionality will work immediately. No code changes are needed.
