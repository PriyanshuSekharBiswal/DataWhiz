# DataWhiz

DataWhiz is an AI-powered data analysis platform that transforms CSV and Excel files into interactive dashboards, insights, visualizations, and business recommendations.

## Features

- Upload CSV and Excel datasets
- Automatic schema detection and data profiling
- Data quality analysis and validation
- KPI generation and dashboard creation
- Interactive charts and tables
- Ask questions about your data using natural language
- AI-generated statistical notes and business insights
- Forecasting and trend analysis
- Data dictionary generation
- Market news and contextual insights
- Support for multiple analytical domains
- Gemini and OpenRouter AI provider support

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Recharts
- Chart.js
- PapaParse
- SheetJS
- Google Gemini API
- OpenRouter API
- Tavily API

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm
- API keys for the AI and news services

### Installation

Clone the repository:

```bash
git clone https://github.com/PriyanshuSekharBiswal/DataWhiz.git
cd DataWhiz

Install dependencies:
npm install

Create a .env.local file in the project root:

OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=your_openrouter_model
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
NEXT_PUBLIC_APP_NAME=DataWhiz

Start the development server:
npm run dev

Open http://localhost:3000 in your browser.


Available Scripts
npm run dev

Starts the development server.
npm run build

Creates a production build.
npm run start

Starts the production server.
npm run lint

Runs the Next.js linting process.
```

Usage
Open DataWhiz in your browser.
Upload a CSV or Excel file.
Wait for the analysis pipeline to process the dataset.
Explore KPIs, charts, tables, statistics, quality reports, and insights.
Use the Ask Data interface to ask questions in natural language.
Apply filters and explore different analytical views.


Project Structure
app/             Next.js pages and API routes
components/      Reusable React UI components
lib/              Data processing, AI, analytics, and visualization logic
public/           Static assets and branding
scripts/          Testing and development scripts
tests/            Test fixtures and contract tests


Environment Variables
DataWhiz uses environment variables for external services:

OPENROUTER_API_KEY: OpenRouter authentication key
OPENROUTER_MODEL: OpenRouter model identifier
GEMINI_API_KEY: Google Gemini authentication key
TAVILY_API_KEY: Tavily API key for market news
NEXT_PUBLIC_APP_NAME: Application display name
Never commit .env.local or expose API keys publicly.

License
This project is private and intended for authorized use.
