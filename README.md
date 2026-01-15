# Cath Lab Credential Tracker

A web-based application for tracking education competencies, licenses, certifications, and credentials for cardiac cath lab staff.

## 🎯 Overview

This application replaces paper-based credential tracking with digital management, automated reminders, and compliance reporting. Built as a demo/proof-of-concept for hospital IT approval.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation & Running

1. **Navigate to the project directory:**
   ```bash
   cd "c:\VS Code\cath-lab-credential-tracker"
   ```

2. **Start the Backend Server:**
   ```bash
   cd server
   npm run dev
   ```
   Backend will run on `http://localhost:3001`

3. **Start the Frontend (in a new terminal):**
   ```bash
   cd client
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

4. **Access the Application:**
   Open your browser and go to `http://localhost:5173`

### Default Login Credentials

- **Coordinator (Full Access):**
  - Username: `coordinator`
  - Password: `demo123`

- **Manager (Read-Only):**
  - Username: `manager`
  - Password: `demo123`

## 📁 Project Structure

```
cath-lab-credential-tracker/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── context/     # React context (auth)
│   │   ├── pages/       # Page components
│   │   └── utils/       # API utilities
│   └── package.json
├── server/              # Node.js/Express backend
│   ├── server.js        # Main server file
│   ├── database.js      # SQLite schema
│   ├── seedData.js      # Pre-configured credential types
│   └── package.json
├── database/            # SQLite database file
├── uploads/             # Uploaded documents
└── docs/                # Specification documents
```

## ✨ Features Implemented

### Phase 1 (Current - MVP)

✅ **Authentication System**
- Secure login with session management
- Role-based access control (Coordinator vs Manager)
- Password hashing with bcrypt

✅ **Staff Management**
- Add, view, edit, and archive staff members
- Support for permanent, traveler, PRN, and float staff
- Employee information tracking (ID, role, contact info, etc.)
- Traveler contract date tracking

✅ **Credential Type Configuration**
- Pre-configured credential types (RCIS, ACLS, BLS, etc.)
- Fully editable credential types
- Support for:
  - Licenses (RN, RT, etc.)
  - Certifications (ACLS, BLS, RCIS, RCES, etc.)
  - Competencies (Radiation Safety, Sheath Removal, etc.)
  - Annual requirements (HIPAA, Fire Safety, etc.)
- Configurable renewal periods and CEU requirements
- Role-specific requirements (RN, Tech, RT, All, Custom)

✅ **Credential Tracking**
- Assign credentials to staff members
- Track issue and expiration dates
- Automatic status calculation
- Credential history (superseded records)

✅ **Dashboard**
- Real-time compliance statistics
- Color-coded status indicators (🟢🟡🔴)
- Upcoming expirations view (30/60/90 day filters)
- At-a-glance staff overview

✅ **Database**
- SQLite for development (easy to migrate to PostgreSQL)
- Full audit logging
- Data retention for compliance
- Sample data pre-loaded for demo

### Planned Features (Phase 2+)

⬜ **CEU Tracking**
- Log continuing education hours
- Track CEU progress toward certification renewals
- CEU application to multiple credentials

⬜ **Email Notifications**
- Automated expiration reminders
- Daily digest for coordinators
- SMTP/Outlook integration

⬜ **Advanced Reports**
- Compliance summary reports
- Individual staff reports (printable)
- Credential type reports
- Export to Excel/PDF

⬜ **Document Management**
- Upload verification documents
- Document preview
- Version history

⬜ **Bulk Operations**
- Bulk credential assignment
- Bulk reminder sending
- Bulk status updates

⬜ **Staff Self-Service Portal**
- Staff can view their own credentials
- Upload their own documents
- Update contact information

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

The system comes with 17 pre-configured credential types based on your specification:

**Licenses:**
- RN License - Michigan
- Compact Nursing License
- Radiologic Technologist License

**Certifications:**
- RCIS Certification (for Techs)
- RCES Certification (for EP Techs)
- ACLS (for All)
- BLS (for All)
- PALS (for RN)
- NIHSS Certification

**Competencies:**
- Conscious Sedation (for RN)
- Arterial/Venous Sheath Removal (for RN, Tech)
- Hemodynamic Monitoring (for All)
- Radiation Safety (for All)
- Emergency Response (for All)

**Annual Requirements:**
- HIPAA Training (for All)
- Fire Safety (for All)
- Bloodborne Pathogens (for All)

All credential types are fully editable through the UI.

## 🚧 Development Notes

### Running in Production

This is currently configured for local development. For production deployment:

1. Set `NODE_ENV=production`
2. Configure proper session secret
3. Enable HTTPS
4. Migrate to PostgreSQL
5. Configure hospital SMTP for emails
6. Integrate with hospital SSO/Active Directory

### Database Location

The SQLite database is stored at:
```
C:\VS Code\cath-lab-credential-tracker\database\credentials.db
```

### Stopping the Servers

Press `Ctrl+C` in each terminal window to stop the servers.

## 📝 Next Steps for IT Approval

This demo includes:
- ✅ Professional, polished UI
- ✅ Working authentication and role-based access
- ✅ Core credential tracking functionality
- ✅ Dashboard with visual status indicators
- ✅ Audit logging for compliance
- ✅ Security best practices

After IT approval, we can:
- Deploy to hospital infrastructure
- Integrate with Outlook for email notifications
- Add SSO/Active Directory integration
- Migrate to PostgreSQL on hospital servers
- Implement remaining Phase 2 features

## 📧 Support

For questions or issues, refer to the specification documents in the `/docs` folder.

---

**Version:** 1.0.0 (Demo/Proof-of-Concept)
**Last Updated:** January 7, 2026
