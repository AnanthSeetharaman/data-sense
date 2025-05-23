
# DataLens - Unified Data Catalog

DataLens is a Next.js application designed to help users discover, understand, and manage data assets from various sources. It provides a user-friendly interface for exploring data, viewing schemas, managing tags, and leveraging AI for suggestions.

## Features

*   **Data Discovery**: Browse and search data assets from multiple sources.
*   **Source Support (Simulated/Live)**:
    *   **MetaStore (CSV-backed)**: Simulates a metastore using CSV files for rapid prototyping.
    *   **Snowflake [LIVE]**: Connects to a live Snowflake instance to fetch table metadata and sample data.
*   **Detailed Asset View**: Inspect table schemas, descriptions, owners, and modification dates.
*   **Sample Data Viewer**: View sample records from data assets.
*   **Lineage Tracking**: View upstream and downstream dependencies for Snowflake assets (requires `SNOWFLAKE.ACCOUNT_USAGE` access).
*   **AI-Powered Features**:
    *   AI Tag Suggester for datasets.
    *   AI Chat Assistant to help build filters based on natural language queries.
*   **Bookmarking**: Save frequently accessed data assets.
*   **Admin Tools**:
    *   Manage mock database CSV files.
    *   Manage sample data CSV files.
*   **Region & Data Source Configuration**: Select global region and preferred sample data sources.
*   **Theme Toggle**: Light and Dark mode support.
*   **Resizable Sidebar**: For better user experience.

## Tech Stack

*   **Frontend**: Next.js (App Router), React, TypeScript
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS
*   **AI Integration**: Genkit (with Google AI)
*   **Database Drivers (for live connections)**: `snowflake-sdk`, `pg`

## Local Development Setup

### Prerequisites

*   [Node.js](https://nodejs.org/) (LTS version recommended, e.g., v18 or v20)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
*   Access to a Snowflake account (if testing live Snowflake features).
*   A Google AI API Key (for Genkit AI features).

### 1. Clone the Repository

```bash
# If you have access to the repository, clone it:
# git clone <repository-url>
# cd <repository-directory>
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables

Create a `.env` file in the root of your project by copying the `.env.example` file (if one exists) or by creating a new one. Populate it with the necessary credentials and configurations:

```env
# Next.js API URL (used by server components to call local API routes)
NEXT_PUBLIC_API_URL=http://localhost:9002 # Adjust port if necessary

# Genkit / Google AI
# Get your API key from Google AI Studio: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=YOUR_GOOGLE_AI_API_KEY

# Snowflake Connection Details (for live Snowflake integration)
# Replace with your actual Snowflake credentials and identifiers.
SNOWFLAKE_ACCOUNT=your_snowflake_account_identifier # e.g., xy12345.us-east-1
SNOWFLAKE_USERNAME=your_snowflake_username
SNOWFLAKE_PASSWORD=your_snowflake_password
SNOWFLAKE_WAREHOUSE=your_snowflake_warehouse
SNOWFLAKE_DATABASE=your_default_database_for_discovery # Database to query for table listings
SNOWFLAKE_SCHEMA=your_default_schema # Optional: default schema for connection
SNOWFLAKE_REGION=your_snowflake_region # Optional: e.g., us-east-1. Only needed if not part of the account identifier.
SNOWFLAKE_AUTHENTICATOR= # e.g., SNOWFLAKE (for username/password), leave blank or specify if using others like OAUTH. Avoid EXTERNALBROWSER for server-side.

# PostgreSQL Connection Details (Placeholder for future implementation)
POSTGRES_HOST=your_postgres_host
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DATABASE=your_postgres_database
POSTGRES_PORT=5432
```

**Important Notes on `.env`:**

*   The `SNOWFLAKE_DATABASE` variable in `.env` is used by the `/api/snowflake-assets` endpoint to determine which database to query for the initial table listing on the Discover page.
*   The `SNOWFLAKE_AUTHENTICATOR` variable:
    *   If using username/password, you can leave this blank or set it to `SNOWFLAKE`. `SNOWFLAKE_PASSWORD` must be provided.
    *   `EXTERNALBROWSER` is **not supported** for the server-side connection tests or API routes.
*   **Never commit your `.env` file with real credentials to version control.** Add `.env` to your `.gitignore` file.

### 4. Running the Application

You need to run two separate processes for the application to function fully:

*   **Next.js Development Server**:
    ```bash
    npm run dev
    ```
    This will typically start the application on `http://localhost:9002`.

*   **Genkit Development Server** (for AI features):
    Open a new terminal window and run:
    ```bash
    npm run genkit:dev
    # or for auto-reloading on Genkit flow changes:
    # npm run genkit:watch
    ```
    This starts the Genkit server, typically on `http://localhost:3400` (Genkit UI) and `http://localhost:21000` (Flow server).

### 5. Accessing the Application

Once both servers are running, open your browser and navigate to `http://localhost:9002` (or the port Next.js is running on).

## Project Structure Highlights

*   `src/app/`: Next.js App Router pages and API routes.
*   `src/components/`: Reusable React components.
    *   `src/components/ui/`: ShadCN UI components.
    *   `src/components/layout/`: Core layout components like `AppShell`.
    *   `src/components/data-asset/`: Components related to displaying data assets.
*   `src/ai/`: Genkit AI flows and configuration.
    *   `src/ai/flows/`: Specific AI flows (e.g., tag suggestion, query to filters).
*   `src/lib/`: Utility functions, type definitions, and data loaders.
    *   `src/lib/csv-data-loader.ts`: Loads initial data from CSV files in `public/db_mock_data/` to simulate a database for "MetaStore" source.
*   `src/contexts/`: React Context providers for global state (e.g., Filters, Region).
*   `public/db_mock_data/`: CSV files used to simulate the application's database backend for the "MetaStore" source.
*   `public/sample_data/`: Individual CSV files for sample data viewing/downloading on the asset detail page.

## Using the Application

*   **Discover Page**:
    *   Initially blank. Use the filters in the left sidebar to select a "Data Source" ("MetaStore" or "Snowflake [ LIVE ]") and optionally add tags.
    *   Click "Apply Filters" to load data assets.
    *   Use the "Chat with AI" button to get filter suggestions based on natural language.
*   **Settings Page**:
    *   Test Snowflake connection using credentials from your `.env` file. The globally selected "Region" from the top header is also considered by the connection logic if your Snowflake account identifier doesn't specify a region.
*   **Admin Pages**:
    *   `/admin/sample-viewer`: Manage individual sample CSV files associated with data assets.
    *   `/admin/asset-data-manager`: Manage the core mock database CSV files (e.g., `users.csv`, `data_assets.csv`).

Remember that CSV uploads in the admin sections are client-side simulations for this prototype and do not persist changes to the server's file system.
```