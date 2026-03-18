# **App Name**: ComptaFisc-DZ

## Core Features:

- Secure User Authentication & Multi-Tenant Setup: Users can sign up, manage their multi-role access (e.g., dossier_manager, comptable), create their initial accounting tenant, and access the application securely using Firebase Authentication, with roles defined in Firestore. mode multi langue (Fr,Ar)
- Client-Side Tax & Payroll Calculation Engine: Dynamically calculates Algerian taxes (TVA, TAP, IRG, IBS, IFU) and payroll (CNAS, CASNOS) entirely client-side, based on latest regulations and rates stored in Firestore, ensuring zero hardcoded constants.
- Journal Entry & Chart of Accounts (SCF): Users can create and validate accounting entries following the official Algerian Chart of Accounts (SCF), with real-time debit/credit balance checks and automatic aggregation for declaration caches in Firestore.
- Compliant Invoicing with Dynamic Stamp Duty: Generate professional invoices conforming to Algerian fiscal regulations (LF 2026), including automatic calculation of progressive stamp duty based on payment method and real-time ledger updates, all within the client browser.
- Tax Declaration Generation & Archiving: Automate the preparation of key Algerian tax and social forms (e.g., G50, G12, G11, G4, G1, DAS, CNAS DAC) with client-side PDF generation using jsPDF and SHA-256 validated archiving to Cloud Storage.
- AI Fiscal Assistant with Legal Corpus (RAG Tool): An AI-powered tool leveraging Gemini to answer complex fiscal questions by searching and citing relevant articles from a pre-seeded legal corpus (CIDTA/CTCA) stored in Firestore, ensuring precise and sourced information.
- OCR for Invoice Ingestion & Fiscal Health Score: Utilize Gemini Vision API for intelligent data extraction from uploaded invoices, auto-populating accounting entries. A comprehensive fiscal health score (0-100) is calculated and provided with proactive alerts for compliance.

## Style Guidelines:

- Primary color: A deep, professional blue (#0C55CC) to convey reliability and governmental compliance, drawing inspiration from DGI branding.
- Background color: A subtle, desaturated cool grey (#ECF1F6), providing a clean and readable canvas for data and forms.
- Accent color: A vibrant cyan (#26D9D9) for highlights and interactive elements, adding a modern and fresh touch.
- Headline and body font: 'Inter' (sans-serif) for its modern, objective, and highly legible appearance, perfect for a data-intensive application.
- Use clean, modern, outline-style icons from a library like Lucide React, ensuring clarity and professionalism without excessive visual weight.
- Implement a responsive layout featuring an adaptive sidebar for navigation and a dedicated dossier switcher for easy multi-client management, ensuring usability across devices.
- Incorporate subtle, functional animations for transitions, loading states, and form feedback to enhance the user experience without causing distractions.