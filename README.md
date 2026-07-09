# Cath Lab Credential Tracker

A web-based application for tracking education competencies, licenses, certifications, and credentials for cardiac cath lab staff.

## 🎯 Overview

This application replaces paper-based credential tracking with digital management, automated reminders, and compliance reporting. Built as a demo/proof-of-concept for hospital IT approval.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation & Running

1. Clone the repository and navigate into it:
   ```bash
   git clone https://github.com/ashleyhoward002/cath-lab-credential-tracker.git
   cd cath-lab-credential-tracker
   ```

2. Start the Backend Server:
   ```bash
   cd server
   npm install
   npm run dev
   ```
   Backend will run on `http://localhost:3001`

3. Start the Frontend (in a new terminal):
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

4. Access the Application: Open your browser and go to `http://localhost:5173`

### Setting Up Local Accounts

This is a local demo/proof-of-concept, so it does not ship with any preconfigured usernames or passwords. Run the seed script (`server/seedData.js`) to create your own local Coordinator (full access) and Manager (read-only) accounts before logging in.

## 📁 Project Structure

```
cath-lab-credential-tracker/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── context/     # React context (auth)
│   │   ├── pages/       # Page components
│   │   └── utils/       # API utilities
│   └── package.json
├── server/          # Node.js/Express backend
│   ├── server.js        # Main server file
│   ├── database.js      # SQLite schema
│   ├── seedData.js      # Pre-configured credential types
│   └── package.json
├── database/        # SQLite database file
├── uploads/         # Uploaded documents
└── docs/            # Specification documents
```

## ✨ Features Implemented

### Phase 1 (Current - MVP)

**Authentication System**
- Secure login with session management
- Role-based access control (Coordinator vs Manager)
- Password hashing with bcrypt

**Staff Management**
- Add, view, edit, and archive staff members
- Support for permanent, traveler, PRN, and float staff
- Employee information tracking (ID, role, contact info, etc.)
- Traveler contract date tracking

**Credential Type Configuration**
- Pre-configured credential types (RCIS, ACLS, BLS, etc.)
- Fully editable credential types
- Support for licenses (RN, RT, etc.), certifications (ACLS, BLS, RCIS, RCES, etc.), competencies (Radiation Safety, Sheath Removal, etc.), and annual requirements (HIPAA, Fire Safety, etc.)
- Configurable renewal periods and CEU requirements
- Role-specific requirements (RN, Tech, RT, All, Custom)

**Credential Tracking**
- Assign credentials to staff members
- Track issue and expiration dates
- Automatic status calculation
- Credential history (superseded records)

**Dashboard**
- Real-time compliance statistics
- Color-coded status indicators (🟢🟡🔴)
- Upcoming expirations view (30/60/90 day filters)
- At-a-glance staff overview

**Database**
- SQLite for development (easy to migrate to PostgreSQL)
- Full audit logging
- Data retention for compliance
- Sample data pre-loaded for demo

### Planned Features (Phase 2+)
- CEU tracking (log continuing education hours, track progress toward renewals)
- Email notifications (automated expiration reminders, SMTP/Outlook integration)
- Advanced reports (compliance summaries, printable staff reports, Excel/PDF export)
- Document management (upload verification documents, previews, version history)
- Bulk operations (bulk credential assignment, reminders, status updates)
- Staff self-service portal

## 🗄️ Database Schema

The application uses SQLite with the following main tables:
- `users` - Authentication and user roles
- `staff_members` - Staff information
- `credential_types` - Configurable credential templates
- `staff_credentials` - Assigned credentials with status
- `ceu_entries` - CEU tracking
- `documents` - Uploaded files
- `audit_log` - Change history

## 🎨 Technology Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** SQLite (development) → PostgreSQL (production)
- **Authentication:** bcrypt + express-session
- **File Upload:** Multer

## 🔒 Security Features

- Password hashing with bcrypt
- Session-based authentication
- Role-based access control
- SQL injection prevention (parameterized queries)
- Input validation and sanitization
- Audit logging of all data changes
- CORS configuration

## 📊 Pre-Configured Credential Types

The system comes with 17 pre-configured credential types based on the project specification:

**Licenses:** RN License (Michigan), Compact Nursing License, Radiologic Technologist License

**Certifications:** RCIS Certification (Techs), RCES Certification (EP Techs), ACLS (All), BLS (All), PALS (RN), NIHSS Certification

**Competencies:** Conscious Sedation (RN), Arterial/Venous Sheath Removal (RN, Tech), Hemodynamic Monitoring (All), Radiation Safety (All), Emergency Response (All)

**Annual Requirements:** HIPAA Training (All), Fire Safety (All), Bloodborne Pathogens (All)

All credential types are fully editable through the UI.

## 🚧 Development Notes

### Running in Production

This is currently configured for local development. For production deployment:
- Set `NODE_ENV=production`
- Configure a proper session secret
- Enable HTTPS
- Migrate to PostgreSQL
- Configure hospital SMTP for emails
- Integrate with hospital SSO/Active Directory

### Database Location

By default, the SQLite database is stored at `database/credentials.db`, relative to the project root.

### Stopping the Servers

Press `Ctrl+C` in each terminal window to stop the servers.

## 📝 Next Steps for IT Approval

This demo includes:
- Professional, polished UI
- Working authentication and role-based access
- Core credential tracking functionality
- Dashboard with visual status indicators
- Audit logging for compliance
- Security best practices

After IT approval, we can:
- Deploy to hospital infrastructure
- Integrate with Outlook for email notifications
- Add SSO/Active Directory integration
- Migrate to PostgreSQL on hospital servers
- Implement remaining Phase 2 features

## 📧 Support

For questions or issues, refer to the specification documents in the `/docs` folder.

**Version:** 1.0.0 (Demo/Proof-of-Concept)
**Last Updated:** January 7, 2026
