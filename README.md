# mvp-summit-bingo
Web app for MVPs to track all those common phrases we hear over the week. Who will get bingo first

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- An [Azure Cosmos DB](https://azure.microsoft.com/en-us/products/cosmos-db/) account
- An [Azure AD](https://azure.microsoft.com/en-us/products/active-directory/) app registration (for authentication)

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
| `AZURE_AD_CLIENT_ID` | Client ID from your Azure AD app registration |
| `AZURE_AD_CLIENT_SECRET` | Client secret from your Azure AD app registration |
| `AZURE_AD_TENANT_ID` | Your Azure AD tenant ID |
| `COSMOS_ENDPOINT` | The URI of your Cosmos DB account |
| `COSMOS_KEY` | The primary key for your Cosmos DB account |
| `COSMOS_DATABASE` | Cosmos DB database name (default: `bingo`) |
| `COSMOS_CONTAINER_PHRASES` | Container for bingo phrases (default: `phrases`) |
| `COSMOS_CONTAINER_USERS` | Container for users (default: `users`) |
| `COSMOS_CONTAINER_CARDS` | Container for bingo cards (default: `cards`) |
| `COSMOS_CONTAINER_PROGRESS` | Container for game progress (default: `progress`) |
| `ADMIN_EMAIL_ALLOWLIST` | Comma-separated list of admin email addresses |

#### Generating a NextAuth secret

```bash
npx auth secret
```

#### Azure AD app registration

1. Go to the [Azure Portal](https://portal.azure.com) > **Azure Active Directory** > **App registrations** > **New registration**.
2. Set the redirect URI to `http://localhost:3000/api/auth/callback/azure-ad` (use your production URL when deploying).
3. Under **Certificates & secrets**, create a new client secret.
4. Copy the **Application (client) ID**, **Directory (tenant) ID**, and the client secret value into `.env.local`.

#### Cosmos DB setup

Create a Cosmos DB account (API: NoSQL) and a database named `bingo` with the following containers (partition key `/id` for each):

- `phrases`
- `users`
- `cards`
- `progress`

Copy the account URI and primary key from **Keys** in the Azure Portal into `.env.local`.

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
