# Findexus
A full-stack web application designed to speed-up investment research by allowing you to access SEC Filings from simply entering a ticker symbol in a search bar

## About The Project
For many investors, the research/learning process is fragmented. Juggling multiple browser tabs for stock quotes, financial statements, news, and personal notes is inefficient and makes it difficult to build a cohesive investment thesis.

**Findexus** aims to solve this by providing a single, streamlined platform where critical market data and personal insights live side-by-side. By fetching comprehensive company information with a simple ticker search, it allows users to focus on what matters most: analysis and strategy.

This is NOT a product to TELL YOU what to invest in. Ultimately you have to make that decision for yourself. This is simply to help you along your journey.

This project was built to be a personal tool.

---

## Built With

This project utilizes a modern, robust, and scalable tech stack.

* **Frontend:**
    * [Next.js](https://nextjs.org/) (React Framework)
    * [Tailwind CSS](https://tailwindcss.com/)
    * [Recharts](https://recharts.org/) (for data visualization)
* **Backend:**
    * [FastAPI](https://fastapi.tiangolo.com/) (For building APIs)
    * [LangExtract](https://pypi.org/project/langextract/) (Using for advanced information extraction)
    * [PostgreSQL](https://www.postgresql.org/) (Using for storing login data)
    * [Redis](https://redis.io/docs/latest/) (Using for caching to reduce calls to SEC)
* **Database & Authentication:**
    * [Supabase](https://supabase.io/) (PostgreSQL hosting, Auth, and APIs)
* **Data Source:**
    * [EdgarTools](https://edgartools.readthedocs.io/en/latest/) (Makes it simple to access, analyze, and extract insights from SEC filings)

---

## Getting Started
TBD

## Features
Will probably change lol

* ✅ **SEC Filing Search:** Fetch company financial doucments.
* 📈 **Historical Charting:** Visualize historical performance with interactive charts.
* 🔐 **Secure User Authentication:** User accounts are managed securely via Supabase Auth.
* 📱 **Responsive Design:** A clean and functional UI that works on desktop to being with.