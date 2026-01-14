# Apple/Google OAuth + Staff Roles (proper setup)

This is the correct way to launch sign-in and manage staff access.

## Part A — Google OAuth (NextAuth)

1) In Google Cloud Console:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: Web application

2) Add Authorized redirect URI:
   - `https://YOUR-DOMAIN/api/auth/callback/google`

3) Copy values into Render env vars:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

## Part B — Apple OAuth (NextAuth)

Apple is stricter. You need:
- A Service ID (client id)
- A private key (client secret)
- Correct redirect URL

1) In Apple Developer:
   - Create a **Service ID** (this becomes `APPLE_CLIENT_ID`)
   - Enable “Sign in with Apple”

2) Configure the redirect URL:
   - `https://YOUR-DOMAIN/api/auth/callback/apple`

3) Create the client secret:
   - You’ll generate the JWT client secret using your Key ID + Team ID + private key
   - Put the final secret into:
     - `APPLE_CLIENT_SECRET`

## Part C — Required NextAuth env

In Render env vars:
- `NEXTAUTH_URL` = `https://YOUR-DOMAIN`
- `NEXTAUTH_SECRET` = long random string

If `NEXTAUTH_URL` is wrong, OAuth will break.

## Part D — Staff roles (clean workflow)

### 1) Rule
- New users default to `customer`.
- Only a `manager` can promote to `staff` or `manager`.

### 2) Use the manager dashboard

1) Create the first manager (one time):
   - Sign in as the owner
   - Go to `/setup` and enter `INITIAL_MANAGER_SETUP_CODE`

2) Promote staff:
   - Go to `/manager/users`
   - Search by email/name
   - Click “Make staff”

3) Disable accounts when needed:
   - `/manager/users` → “Disable”

Notes:
- Role changes are recorded in the database (`RoleChange`) with an optional note.

## Part E — Turn off dev sign-in for launch

For public launch, set:
- `DEV_AUTH_ENABLED="false"`
- `NEXT_PUBLIC_DEV_AUTH_ENABLED="false"`

