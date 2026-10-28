# mvp-summit-bingo
Web app for MVPs to track all those common phrases we hear over the week. Who will get bingo first

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- An [Azure Cosmos DB](https://azure.microsoft.com/en-us/products/cosmos-db/) account
- At least one OAuth provider configured (Microsoft, GitHub, or Facebook)

### 1. Clone the repository

```bash
git clone https://github.com/kevmcdonk/mvp-summit-bingo.git
cd mvp-summit-bingo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | The base URL of the app (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | A random secret string for NextAuth session encryption |
| `AZURE_AD_CLIENT_ID` | Client ID from your Microsoft Entra ID app registration (optional) |
| `AZURE_AD_CLIENT_SECRET` | Client secret from your Microsoft Entra ID app registration (optional) |
| `AZURE_AD_TENANT_ID` | Your tenant ID, or `common` to allow personal + org accounts (optional, defaults to `common`) |
| `GITHUB_CLIENT_ID` | Client ID from your GitHub OAuth App (optional) |
| `GITHUB_CLIENT_SECRET` | Client secret from your GitHub OAuth App (optional) |
| `FACEBOOK_CLIENT_ID` | App ID from your Facebook App (optional) |
| `FACEBOOK_CLIENT_SECRET` | App secret from your Facebook App (optional) |
| `COSMOS_ENDPOINT` | The URI of your Cosmos DB account |
| `COSMOS_KEY` | The primary key for your Cosmos DB account |
| `COSMOS_DATABASE` | Cosmos DB database name (default: `bingo`) |
| `COSMOS_CONTAINER_PHRASES` | Container for bingo phrases (default: `phrases`) |
| `COSMOS_CONTAINER_USERS` | Container for users (default: `users`) |
| `COSMOS_CONTAINER_CARDS` | Container for bingo cards (default: `cards`) |
| `COSMOS_CONTAINER_PROGRESS` | Container for game progress (default: `progress`) |
| `COSMOS_CONTAINER_CONFERENCE_GUESSES` | Container for ESPC location guesses, one per user with full edit history (default: `conference-guesses`) |
| `COSMOS_CONTAINER_SETTINGS` | Container for app settings such as the correct ESPC location (default: `settings`) |
| `ADMIN_EMAIL_ALLOWLIST` | Comma-separated list of admin email addresses |

> **Note:** You only need to configure the providers you want to use. At least one provider must be configured. Any provider whose `*_CLIENT_ID` variable is not set will be skipped.

#### Generating a NextAuth secret

```bash
npx auth secret
```

#### Azure AD app registration

1. Go to the [Azure Portal](https://portal.azure.com) > **Microsoft Entra ID** > **App registrations** > **New registration**.
2. Set the redirect URI to `http://localhost:3000/api/auth/callback/azure-ad` (use your production URL when deploying).
3. To allow **personal Microsoft accounts** (e.g. @outlook.com, @hotmail.com), choose **"Accounts in any organizational directory and personal Microsoft accounts"** under Supported account types.
4. Under **Certificates & secrets**, create a new client secret.
5. Copy the **Application (client) ID**, **Directory (tenant) ID**, and the client secret value into `.env.local`.
6. Set `AZURE_AD_TENANT_ID` to `common` if you want to allow both personal and organizational accounts. Use a specific tenant ID to restrict to a single organisation.

#### GitHub OAuth App setup

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers) > **New OAuth App**.
2. Set **Homepage URL** to `http://localhost:3000` (or your production URL).
3. Set **Authorization callback URL** to `http://localhost:3000/api/auth/callback/github`.
4. Copy the **Client ID** and generate a **Client secret**.
5. Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to `.env.local`.

#### Facebook App setup

1. Go to [Facebook Developers](https://developers.facebook.com/) > **My Apps** > **Create App**.
2. Choose **Consumer** app type.
3. Under **Facebook Login > Settings**, add `http://localhost:3000/api/auth/callback/facebook` as a valid OAuth redirect URI.
4. Copy the **App ID** and **App Secret** from **Settings > Basic**.
5. Add `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` to `.env.local`.

#### Cosmos DB setup

Create a Cosmos DB account (API: NoSQL) and a database named `bingo` with the following containers (partition key `/id` for each):

- `phrases`
- `users`
- `cards`
- `progress`
- `conference-guesses`
- `settings`

The app also creates these containers automatically on first use if they don't exist.

Copy the account URI and primary key from **Keys** in the Azure Portal into `.env.local`.

### ESPC location guess page

`/guess` lets each signed-in user submit a free-text guess for where the next ESPC conference will be held. Each user has a single guess which they can change until the answer is revealed; every submission is kept in a `history` array on the user's document so admins can audit changes. Admins see all guesses (with expandable history) and set the correct answer from the **ESPC Location Guesses** section of `/admin`. Setting the answer locks guessing and highlights matching guesses (case-, accent- and punctuation-insensitive). Admins can also delete an individual guess (with its history), letting that user guess again, or delete all guesses.

### Resetting the game

Admins can wipe all players from `/admin` using **Clear all users & cards** (above the User Progress table). This deletes every document in the `users`, `cards` and `progress` containers after the admin types `DELETE ALL USERS` to confirm. Phrases, ESPC guesses and settings are kept; players receive a fresh random card on their next visit.

To reset a single player, use the **Reset progress** button on their row in the User Progress table (`DELETE /api/admin/users?userId=<id>`). This deletes that user's card and progress but keeps their profile, so they stay listed and get a fresh random card next time they play.
### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Troubleshooting certificate errors

If you see an error like `self-signed certificate; if the root CA is installed locally, try running Node.js with --use-system-ca`, this project already runs Next.js with `--use-system-ca` in the npm scripts.

If the error still appears:

- Make sure your corporate/internal root CA certificate is installed in your OS trust store.
- Restart your terminal and rerun `npm run dev`.
- Verify your `COSMOS_ENDPOINT` and other external endpoints are correct and trusted.

### 5. Run tests

```bash
npm test
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |


## Process
For any chances, run them through the dev branch first

## Deploying to Azure Web App

### Option A: Deploy via Azure CLI

1. **Build the app for production:**

   ```bash
   npm run build
   ```

2. **Create an Azure Web App** (Node.js 18+ on Linux recommended):

   ```bash
   az group create --name mvp-bingo-rg --location eastus
   az appservice plan create --name mvp-bingo-plan --resource-group mvp-bingo-rg --sku B1 --is-linux
   az webapp create --name <your-app-name> --resource-group mvp-bingo-rg --plan mvp-bingo-plan --runtime "NODE:18-lts"
   ```

3. **Set the startup command:**

   ```bash
   az webapp config set --name <your-app-name> --resource-group mvp-bingo-rg --startup-file "npm run start"
   ```

4. **Configure environment variables** (all the variables from the table above):

   ```bash
   az webapp config appsettings set --name <your-app-name> --resource-group mvp-bingo-rg --settings \
     NEXTAUTH_URL=https://<your-app-name>.azurewebsites.net \
     NEXTAUTH_SECRET=<your-secret> \
     AZURE_AD_CLIENT_ID=<value> \
     AZURE_AD_CLIENT_SECRET=<value> \
     AZURE_AD_TENANT_ID=common \
     GITHUB_CLIENT_ID=<value> \
     GITHUB_CLIENT_SECRET=<value> \
     COSMOS_ENDPOINT=<value> \
     COSMOS_KEY=<value> \
     COSMOS_DATABASE=bingo \
     ADMIN_EMAIL_ALLOWLIST=<admin-emails>
   ```

5. **Deploy the code** (using zip deploy or GitHub Actions):

   ```bash
   az webapp up --name <your-app-name> --resource-group mvp-bingo-rg
   ```

### Option B: Deploy via GitHub Actions

Use the Azure Web App deployment GitHub Action. Azure Portal can generate a workflow file for you under **Deployment Center > GitHub Actions**.

### Post-deployment: Update OAuth redirect URIs

After deploying, update the callback URLs for each provider to use your production domain:

| Provider | Redirect URI |
|---|---|
| Microsoft (Azure AD) | `https://<your-app-name>.azurewebsites.net/api/auth/callback/azure-ad` |
| GitHub | `https://<your-app-name>.azurewebsites.net/api/auth/callback/github` |
| Facebook | `https://<your-app-name>.azurewebsites.net/api/auth/callback/facebook` |

### Important Azure Web App settings

- **NEXTAUTH_URL** must be set to your production URL (e.g. `https://<your-app-name>.azurewebsites.net`). NextAuth will not work without this.
- **NEXTAUTH_SECRET** must be a strong random value in production. Generate one with `openssl rand -base64 32`.
- **WEBSITES_PORT** — if Next.js isn't responding, set this to `3000` in App Settings.
- **SCM_DO_BUILD_DURING_DEPLOYMENT** — set to `true` if using zip deploy so `npm install` runs during deployment.
- Enable **HTTPS Only** in the Azure Portal under TLS/SSL settings.
- For custom domains, update `NEXTAUTH_URL` accordingly and add the domain to each OAuth provider's allowed redirect URIs.
