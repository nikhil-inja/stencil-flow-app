Stencil Flow App: A Unified Automation Manager
Overview
The Stencil Flow App is a full-stack web application designed to address a critical challenge for automation agencies and freelancers: managing multiple workflows across different no-code platforms. This tool provides a centralized dashboard to import, sync, and deploy automations, transforming a tedious manual process into a streamlined, version-controlled workflow. It acts as a single source of truth for all automations, giving agencies a powerful platform to manage client projects efficiently.

Features (Current)
Multi-Account Management: Connect and manage multiple n8n accounts from a single, intuitive dashboard.

Workflow Synchronization: Seamlessly import and sync workflows from any connected n8n instance.

Git-Based Version Control: All workflows are stored and versioned in a central Git repository, providing a clear history of changes and a secure backup.

One-Click Deployment: Deploy synced workflows to any connected n8n instance with a single click, dramatically reducing manual setup and configuration time.

Architectural Highlights
The application is built on a modern, scalable, and secure architecture designed for performance and reliability.

Frontend: The user interface is built with React and styled with Tailwind CSS, providing a fast, responsive, and visually appealing experience.

Backend & APIs: The backend logic is powered by Supabase Edge Functions (built with Deno and TypeScript), offering a secure and performant API layer.

Database: A Supabase PostgreSQL database serves as the persistent data layer, handling user authentication and storing metadata about workflows.

Source of Truth: A dedicated GitHub repository is the central source of truth, storing all workflows and their version history.

Getting Started
To get this project running, follow these simple steps.

Clone the Repository:

git clone https://github.com/nikhil-inja/stencil-flow-app.git
cd stencil-flow-app

Set Up Supabase:

Create a new project in your Supabase account.

Navigate to supabase/functions and deploy the included Deno Edge Functions using the Supabase CLI.

Set up your Supabase database tables as outlined in the included SQL scripts.

Run the Application:

# Install dependencies
npm install

# Start the local development server
npm run dev

The application will be running on http://localhost:5173. You can now create credentials in the database and connect your n8n instances and explore the features.
