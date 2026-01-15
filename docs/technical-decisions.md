# Cath Lab Credential Tracker - Technical Decisions

Answers to Claude Code's implementation questions.

---

## Project Context: Demo-First Approach

**Important:** This is being built as a **proof-of-concept demo** to present to hospital IT/leadership for approval. 

**Two-phase strategy:**
1. **Now:** Build a polished, functional prototype running locally
2. **Later:** Once approved, work with IT to deploy securely with Outlook integration, SSO, etc.

**Implications:**
- Needs to look professional and polished (this will be shown to decision-makers)
- Keep it self-contained with no external dependencies
- Design architecture so it CAN integrate with hospital systems later
- Prioritize getting core features working quickly

---

## 1. Technology Stack

**Decision: Option A - Custom Web Application**

**Recommended Stack:**
- **Frontend:** React (modern, maintainable, good for dashboards)
- **Backend:** Node.js with Express
- **Database:** SQLite for development → PostgreSQL for production
- **Styling:** Tailwind CSS (clean, professional look)

**Rationale:** 
- Full control over features
- No licensing costs
- Looks professional for demo
- Can migrate to hospital infrastructure once approved
- If IT later prefers Power Apps, the data model and business logic transfer

---

## 2. Hosting & Infrastructure

**Decision: Local development for demo phase**

| Phase | Hosting | Purpose |
|-------|---------|---------|
| **Phase 1 (Now)** | Local machine (localhost) | Build and demo to leadership |
| **Phase 2 (After approval)** | Hospital IT infrastructure | Production deployment |
| **Future** | Per IT requirements | May be on-premise or Azure |

**For the demo:**
- Runs entirely on coordinator's laptop
- No network/internet required
- Can demo in a meeting room without IT involvement

**Design for future:**
- Containerize with Docker (makes deployment flexible)
- Keep configuration in environment variables
- Document what IT will need to provide (database server, SMTP, etc.)

---

## 3. Database

**Decision: SQLite for development**

**Rationale:**
- Zero configuration needed
- Single file, easy to backup
- Can migrate to PostgreSQL later with minimal code changes
- Perfect for 35 staff × 15 credentials = ~500 records

**Future migration path:** When ready for production/multi-user, migrate to PostgreSQL.

---

## 4. Project Location & Name

**Decision:** 
- Location: `c:\VS Code\cath-lab-credential-tracker\`
- Project name: `cath-lab-credential-tracker`

---

## 5. Authentication

**Decision: Simple authentication for demo, designed for SSO later**

**Demo Phase Implementation:**
- Username/password login
- Two accounts:
  - `coordinator` / `demo123` (full access)
  - `manager` / `demo123` (read-only)
- Passwords hashed (bcrypt)
- Session-based authentication
- Professional-looking login page

**Security Features to Include (for IT approval):**
- Password hashing (bcrypt)
- Session management
- Role-based access control
- Audit logging of all changes
- Input validation/sanitization

**Future (Post-IT Approval):**
- Integrate with hospital Active Directory / SSO
- Microsoft Entra ID (Azure AD) if using Microsoft 365
- Multi-factor authentication if required
- Session timeout policies per hospital standards

---

## 5b. Security Considerations for IT Approval

**Build these in from the start (demonstrates security-awareness):**

| Security Feature | Demo Phase | Production Phase |
|------------------|------------|------------------|
| Password storage | Hashed (bcrypt) | SSO/AD integration |
| Session management | Secure cookies, httpOnly | Per hospital policy |
| Input validation | All user inputs sanitized | Same |
| SQL injection prevention | Parameterized queries | Same |
| Audit trail | Log all data changes | Same + retention policy |
| Role-based access | Coordinator vs Manager | Add more roles as needed |
| HTTPS | Optional for localhost | Required |
| Data encryption at rest | SQLite (single file, can encrypt) | Per IT requirements |

**What to tell IT during demo:**
- "Authentication is modular—we can swap in Active Directory"
- "All changes are logged for audit compliance"
- "The database can be hosted on your infrastructure"
- "We've built it to meet security requirements, just need your specs"

---

## 6. Document/File Storage

**Decision: Local file system**

**Structure:**
```
/uploads
  /staff
    /{employee_id}
      /{credential_type}
        /document_filename.pdf
```

**Requirements:**
- Accept PDF, JPG, PNG
- Max file size: 10MB
- Store file path reference in database
- Basic file naming: `{lastname}_{credential}_{date}.{ext}`

**Future consideration:** Can migrate to cloud storage (S3/Azure) if needed, but local is fine for Phase 1 with 35 staff.

---

## 7. Email & Notifications

**Decision: Build the infrastructure, but disabled for demo**

**Demo Phase:**
- Email functionality built but turned OFF
- Dashboard shows upcoming expirations (this IS the notification system for now)
- "Notifications" panel shows what emails WOULD be sent
- No SMTP configuration needed to demo

**Implementation:**
- Create email notification module with on/off toggle
- Use nodemailer (supports SMTP, Outlook, SendGrid)
- Email templates for each alert type (90, 60, 30, 14, 7 day)
- Daily digest template
- Configuration screen for SMTP settings (for IT to configure later)

**Future Integration (post-approval):**
- Hospital uses Outlook/Microsoft 365
- IT will provide SMTP credentials or Microsoft Graph API access
- May integrate with hospital email system for compliance
- Could potentially send through coordinator's Outlook account

---

## 8. Phase 1 MVP Priorities

**Absolutely Critical (Week 1-2):**
1. ✅ Staff management (add, edit, view, archive)
2. ✅ Credential type configuration (create custom credential types)
3. ✅ Assign credentials to staff with expiration dates
4. ✅ Dashboard with color-coded status (🟢🟡🔴)
5. ✅ Basic filtering (by status, by person, by credential type)

**Important (Week 3-4):**
6. ✅ Document upload for credentials
7. ✅ Expiration report (next 30/60/90 days)
8. ✅ Individual staff summary report (printable)
9. ✅ Traveler contract date tracking

**Nice to Have (Week 5+):**
10. ⬜ CEU tracking module
11. ⬜ Bulk operations
12. ⬜ Email notifications (when SMTP available)
13. ⬜ Export to Excel/PDF

**Suggested approach:** Build features 1-5 first. Get it working end-to-end before adding more.

---

## 9. Data Migration

**Current state:** Paper-based tracking

**For Demo:**
- Pre-load sample/fake data for demonstration purposes
- 10-15 fictional staff members with varied statuses
- Mix of 🟢🟡🔴 credentials to show color coding
- Include some travelers to demo that feature
- Sample documents (blank PDFs as placeholders)

**Sample Data to Generate:**
```
- 8 permanent staff (mix of RN, Tech, RT)
- 3 travelers with different contract end dates
- ~12 credential types configured
- Mix of statuses:
  - Some fully compliant (all green)
  - Some with expiring credentials (yellow)
  - Some with expired credentials (red)
  - One or two with waivers
```

**After IT Approval (Real Data Entry):**
- Manual entry through the application UI
- 35 staff × ~15 credentials = ~525 records
- Estimate: 2-3 hours of data entry
- Option to build CSV import if helpful

**If coordinator has Excel data:**
- Can build a simple import function
- Template: Name, Employee ID, Credential Type, Issue Date, Expiration Date

---

## 10. Timeline & Priority

**Priority: Start immediately, need working demo soon**

**Goal:** Functional prototype to demo for IT/leadership approval

**Suggested Timeline:**

| Milestone | Target | Features |
|-----------|--------|----------|
| **Week 1** | Basic scaffold | Project setup, database, staff CRUD, login |
| **Week 2** | Core tracking | Credential types, assign to staff, status calculation |
| **Week 3** | Dashboard | Color-coded display, filtering, at-a-glance compliance |
| **Week 4** | Polish | Reports, document upload, UI refinement |
| **Demo Ready** | ~4 weeks | Presentable to leadership |

**Definition of "Demo Ready":**
- Can add/edit staff members
- Can create credential types
- Can assign credentials with expiration dates
- Dashboard shows 🟢🟡🔴 status at a glance
- Can generate a compliance report
- Looks professional (not like a rough prototype)
- Can run demo on laptop in a meeting

**After Demo Approval:**
- Work with IT on security requirements
- Deploy to hospital infrastructure
- Integrate with Outlook for notifications
- Add SSO/Active Directory if required
- Phase 2 features (CEU tracking, staff self-service)

---

## Summary for Claude Code

### Context
This is a **demo/proof-of-concept** to get hospital IT approval. Needs to look polished and professional while running locally on the coordinator's laptop. Design for future integration with hospital systems (Outlook, SSO, secure hosting).

**Start building with:**

| Component | Choice | Future (Post-Approval) |
|-----------|--------|------------------------|
| Frontend | React + Tailwind CSS | Same |
| Backend | Node.js + Express | Same, containerized |
| Database | SQLite (file-based) | PostgreSQL on hospital server |
| Auth | Simple username/password | Hospital SSO/Active Directory |
| File storage | Local filesystem | Hospital secure storage |
| Email | Built but disabled | Outlook/SMTP integration |
| Hosting | Localhost | Hospital infrastructure |

**Build order (prioritize for demo):**
1. Project scaffold + database schema
2. Login page (simple but professional-looking)
3. Staff management (add, edit, view, archive)
4. Credential type configuration
5. Credential assignment and tracking with status colors
6. Dashboard with 🟢🟡🔴 visual status
7. Basic compliance report (printable)
8. Document upload
9. (After demo) Email, CEU tracking, bulk operations

**Project setup:**
```
cath-lab-credential-tracker/
├── client/          # React frontend
├── server/          # Node.js backend
├── database/        # SQLite file + migrations
├── uploads/         # Document storage
└── docs/            # Spec documents
```

**Demo requirements:**
- Must look professional (clean UI, consistent styling)
- Must run without internet connection
- Must work on a laptop for meeting room demos
- Should have sample data pre-loaded for demonstration

Ready to begin development!
