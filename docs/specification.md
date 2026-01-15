# Cath Lab Credential & Competency Tracker
## Application Specification Document

---

## 1. Overview

### Purpose
A web-based application to track education competencies, licenses, certifications, and credentials for cardiac cath lab staff. Replaces paper-based tracking with digital management, automated reminders, and compliance reporting.

### Key Goals
- Eliminate paper tracking and manual expiration monitoring
- Provide at-a-glance compliance visibility
- Automate renewal reminders
- Generate audit-ready reports
- Accommodate changing compliance requirements without code changes
- Handle staff turnover and traveler workforce

### Users
- **Phase 1**: Education Coordinator (primary), Department Manager (read-only)
- **Phase 2**: Staff members (self-service for own records)

---

## 2. Staff Management

### Staff Record Fields
| Field | Type | Notes |
|-------|------|-------|
| Employee ID | Text | Unique identifier |
| First Name | Text | Required |
| Last Name | Text | Required |
| Email | Email | For notifications |
| Phone | Text | Optional |
| Role/Title | Dropdown | RN, RT, Tech, etc. |
| Employment Type | Dropdown | Permanent, Traveler, PRN, Float |
| Hire Date | Date | |
| Traveler Contract Start | Date | If applicable |
| Traveler Contract End | Date | If applicable |
| Home State | Dropdown | For license tracking |
| Status | Dropdown | Active, Inactive, Archived |
| Notes | Text Area | Free-form coordinator notes |

### Staff Status Workflow
```
Active → Inactive (on leave, between contracts)
Active → Archived (terminated, resigned, contract ended)
Inactive → Active (returned from leave)
Archived → Active (rehired - rare, but possible)
```

### Traveler-Specific Considerations
- Contract date tracking with alerts for contract end
- Multi-state license tracking (compact vs. single state)
- Agency information field
- Quick onboarding checklist view

---

## 3. Credential System (Flexible/Extensible)

### Design Philosophy
Rather than hard-coding specific credentials, the system uses a **Credential Type** framework. Coordinators can create, modify, and retire credential types as compliance requirements change.

### Credential Type Template
When creating a new credential type, coordinator defines:

| Setting | Description | Example |
|---------|-------------|---------|
| Name | Display name | "RCIS Certification" |
| Category | Grouping | License, Certification, Competency, CEU, Other |
| Issuing Body | Organization | "Cardiovascular Credentialing International (CCI)" |
| Renewal Period | Months | 24 (for 2-year renewal) |
| CEU Requirement | Number | 16 CEUs per renewal cycle |
| Required For | Role filter | All, RN Only, Tech Only, Custom |
| Is Required | Boolean | Required vs. Optional credential |
| Alert Days | List | [90, 60, 30, 14] days before expiration |
| Verification Required | Boolean | Must upload documentation |
| Notes/Instructions | Text | Renewal process details |

### Pre-Configured Credential Types (Initial Setup)

#### Licenses
- RN License (State) - 24 month cycle
- Compact Nursing License - varies by state
- Radiologic Technologist License - state dependent

#### Certifications
- RCIS (Registered Cardiovascular Invasive Specialist) - 24 months, 16 CEUs
- RCES (Registered Cardiac Electrophysiology Specialist) - 24 months, 16 CEUs
- ACLS (Advanced Cardiac Life Support) - 24 months
- BLS (Basic Life Support) - 24 months
- PALS (Pediatric Advanced Life Support) - 24 months
- NIHSS (NIH Stroke Scale) - facility dependent

#### Unit Competencies
- Conscious Sedation/Moderate Sedation
- Hemodynamic Monitoring
- Arterial/Venous Sheath Removal
- Temporary Pacemaker Management
- IABP (Intra-Aortic Balloon Pump)
- Impella Management
- Cardiac Device Interrogation
- Radiation Safety
- Contrast Reaction Management
- Emergency Response (Code Blue)
- Patient Assessment - Pre/Post Procedure
- Sterile Technique/Scrubbing

#### Annual Requirements
- Annual Skills Fair/Competency Day
- HIPAA Training
- Bloodborne Pathogen Training
- Fire Safety
- Corporate Compliance

### Staff Credential Record
For each credential assigned to a staff member:

| Field | Type | Notes |
|-------|------|-------|
| Credential Type | Reference | Links to credential type |
| Staff Member | Reference | Links to staff record |
| Issue Date | Date | When obtained/renewed |
| Expiration Date | Date | Auto-calculated or manual |
| Status | Auto | Active, Expiring Soon, Expired, Pending, Waived, N/A |
| Verification Doc | File Upload | PDF, image of certificate |
| CEUs Applied | Number | If applicable |
| Verified By | User | Coordinator who verified |
| Verified Date | Date | When documentation verified |
| Notes | Text | Special circumstances |

### Status Definitions
- **Active**: Current and valid
- **Expiring Soon**: Within alert window (default 90 days)
- **Expired**: Past expiration date
- **Pending**: In process of obtaining/renewing
- **Waived**: Temporarily excused (with documented reason)
- **N/A**: Not applicable to this staff member's role

---

## 4. CEU Tracking

### CEU Log Entry
| Field | Type |
|-------|------|
| Staff Member | Reference |
| Date Completed | Date |
| Course/Activity Title | Text |
| Provider | Text |
| Hours/Credits | Number |
| Category | Dropdown (if applicable) |
| Applies To | Multi-select credential types |
| Documentation | File upload |
| Verified | Boolean |

### CEU Dashboard View (per staff member)
- Total CEUs earned in current cycle
- CEUs needed for each certification renewal
- Progress bars showing completion percentage
- List of logged activities

---

## 5. User Roles & Permissions

### Phase 1 Roles

#### Coordinator (Education Coordinator)
Full administrative access:
- Create/edit/archive staff records
- Create/edit credential types
- Assign credentials to staff
- Update credential status and dates
- Upload verification documents
- Log CEUs
- Generate all reports
- Manage system settings
- Send manual reminders

#### Manager (Department Manager, Charge RN)
Read-only access:
- View all staff records
- View all credentials and status
- View dashboard
- Generate reports
- Cannot edit any data

### Phase 2 Roles (Future)

#### Staff (Self-Service)
Limited access to own record:
- View own credentials and status
- Upload own documentation for coordinator review
- Log own CEUs (pending verification)
- Update contact information
- Cannot edit expiration dates or verify

---

## 6. Dashboard & Views

### Coordinator Dashboard
**Summary Cards**
- Total active staff count
- Credentials expiring within 30 days (urgent)
- Credentials expiring within 90 days (warning)
- Currently expired credentials (critical)
- Overall compliance percentage

**Quick Lists**
- Upcoming expirations (next 90 days) - sortable by date, staff, credential type
- Recently expired - action needed
- Pending verifications
- Traveler contracts ending soon

**Filters**
- By credential type
- By staff member
- By employment type
- By status
- Date range

### Staff Roster View
Table view of all staff with:
- Name, role, employment type, status
- Compliance indicator (green/yellow/red)
- Quick stats (X of Y credentials current)
- Click to expand/view details

### Individual Staff View
Complete profile with:
- Personal information
- All assigned credentials with status
- CEU log and progress
- Document repository
- Activity history/audit log
- Notes

### Credential Type View
For each credential type:
- Description and requirements
- List of all staff with this credential
- Compliance statistics
- Bulk actions (send reminders, etc.)

---

## 7. Notifications & Alerts

### Automated Email Reminders
Configurable per credential type:
- Default: 90, 60, 30, 14, 7 days before expiration
- Sent to: Staff member (Phase 2) and/or Coordinator
- Daily digest option for coordinator (all upcoming)

### Email Content
- Staff name and credential
- Expiration date
- Days remaining
- Renewal requirements/instructions
- Link to system (Phase 2)

### In-App Notifications
- Badge counts on dashboard
- Color-coded status indicators
- Pop-up alerts for critical items on login

---

## 8. Reporting

### Standard Reports

#### Compliance Summary Report
- Overall department compliance percentage
- Breakdown by credential type
- Breakdown by staff role
- Trend over time (if historical data available)

#### Expiration Report
- Filterable by date range
- All credentials expiring within selected period
- Exportable to Excel/PDF

#### Individual Staff Report
- Complete credential status for one staff member
- Suitable for personnel file or audit
- Print-friendly format

#### Credential Type Report
- All staff with specific credential
- Current status distribution
- Useful for annual certification audits

#### Traveler Status Report
- All current travelers
- Contract end dates
- Credential compliance status
- Useful for staffing planning

#### Audit Report
- Selected date range
- All credentials that were active during period
- Verification documentation status
- For Joint Commission, state surveys, etc.

### Export Options
- PDF (formatted report)
- Excel/CSV (raw data)
- Print-friendly view

---

## 9. Document Management

### File Storage
- Upload capability for each credential record
- Accepted formats: PDF, JPG, PNG
- File size limit: 10MB per file
- Organized by staff member and credential

### Document Features
- Preview without download
- Download original
- Replace/update document
- Version history (optional)
- Expiration date visible on document record

---

## 10. Data Model Summary

### Core Entities
```
Staff Member
├── Staff Credentials (many)
│   └── Credential Type (reference)
│   └── Documents (many)
├── CEU Entries (many)
└── Notes/History

Credential Type (template)
├── Category
├── Requirements
└── Alert Settings

User Account
├── Role
├── Permissions
└── Linked Staff Record (Phase 2)
```

---

## 11. Technical Considerations

### Platform Options

#### Option A: Custom Web Application
- **Pros**: Fully customizable, no per-user licensing, own your data
- **Cons**: Development time/cost, maintenance responsibility
- **Tech Stack Suggestion**: 
  - Frontend: React or Vue.js
  - Backend: Node.js or Python
  - Database: PostgreSQL
  - Hosting: Cloud (AWS, Azure, or hospital infrastructure)

#### Option B: Low-Code Platform (Power Apps, Airtable, etc.)
- **Pros**: Faster development, easier for non-developers to maintain
- **Cons**: Platform limitations, potential licensing costs, less control
- **Good For**: Proof of concept or if IT resources are limited

#### Option C: Existing Healthcare Compliance Software
- **Pros**: Purpose-built, may integrate with HR systems
- **Cons**: Cost, may have features you don't need, less customizable
- **Examples**: Symplr, HealthStream, Relias

### Security Considerations
- HIPAA considerations (staff data is PHI-adjacent)
- Role-based access control
- Audit logging for all changes
- Secure document storage
- Regular backups
- Password requirements / SSO integration

### Integration Possibilities (Future)
- HR/Payroll system (staff data sync)
- Learning Management System (CEU auto-import)
- Email system (notifications)
- Single Sign-On (SSO)

---

## 12. Implementation Phases

### Phase 1: Core System (MVP)
**Timeline: 8-12 weeks**

1. Staff management (add, edit, archive)
2. Credential type configuration
3. Credential tracking with status
4. Basic document upload
5. Coordinator dashboard
6. Expiration alerts (email)
7. Basic reports (expiration, compliance, individual)
8. Coordinator and Manager roles

**Data Migration**
- Import existing staff list
- Enter current credential data
- Establish baseline

### Phase 2: Enhanced Features
**Timeline: 4-6 weeks after Phase 1**

1. CEU tracking module
2. Advanced reporting
3. Bulk operations
4. Traveler-specific features
5. Dashboard customization

### Phase 3: Staff Self-Service
**Timeline: 4-6 weeks after Phase 2**

1. Staff user accounts
2. Self-service portal
3. Document submission workflow
4. Personal dashboard
5. Mobile-friendly interface

### Phase 4: Advanced Features (Future)
- LMS integration
- HR system integration
- Mobile app
- Advanced analytics
- Competency assessment tools

---

## 13. Initial Credential Type Setup

### Licenses to Configure
| Name | Renewal | CEUs | Required For |
|------|---------|------|--------------|
| RN License - [State] | 24 mo | Varies | RN |
| Compact RN License | Varies | Varies | RN (multistate) |
| Radiologic Tech License | 24 mo | 24 | RT |

### Certifications to Configure
| Name | Renewal | CEUs | Required For |
|------|---------|------|--------------|
| RCIS | 24 mo | 16 | Tech (optional RN) |
| RCES | 24 mo | 16 | EP Staff |
| ACLS | 24 mo | - | All |
| BLS | 24 mo | - | All |
| PALS | 24 mo | - | If Peds cases |
| NIHSS | Per policy | - | If stroke cases |

### Annual Competencies to Configure
| Name | Renewal | Required For |
|------|---------|--------------|
| Conscious Sedation | 12 mo | RN |
| Sheath Removal | 12 mo | RN, Tech |
| Hemodynamic Monitoring | 12 mo | All |
| Radiation Safety | 12 mo | All |
| Emergency Response | 12 mo | All |
| Unit Orientation/Competency | 12 mo | All |

### Annual Training to Configure
| Name | Renewal | Required For |
|------|---------|--------------|
| HIPAA | 12 mo | All |
| Fire Safety | 12 mo | All |
| Bloodborne Pathogens | 12 mo | All |
| Corporate Compliance | 12 mo | All |

---

## 14. Success Metrics

### Operational Goals
- Zero missed credential expirations
- 100% documentation on file for required credentials
- Reduced time spent on manual tracking (target: 75% reduction)
- Audit-ready reports generated in under 5 minutes

### User Adoption Goals
- All current staff entered within 30 days of launch
- Coordinator using system daily within 60 days
- Paper tracking fully eliminated within 90 days

---

## 15. Questions to Resolve

Before development begins, clarify:

1. **Hosting**: Hospital IT infrastructure or cloud-based?
2. **Budget**: Custom development vs. existing platform?
3. **IT Involvement**: Support available? Approval process?
4. **Timeline**: Target go-live date?
5. **Data Migration**: How much historical data to import?
6. **Email**: Can system send emails through hospital system?
7. **Access**: Will users access from hospital network only or remotely?
8. **Mobile**: Priority for mobile access?
9. **Compliance**: Specific regulatory requirements to meet?
10. **Backup**: What are backup/disaster recovery requirements?

---

## Appendix A: Sample Workflows

### New Hire Onboarding
1. Coordinator creates staff record with basic info
2. System auto-assigns required credentials based on role
3. Coordinator enters known credential info (license #, expiration)
4. System flags missing/pending items
5. Coordinator uploads verification documents as received
6. Dashboard shows onboarding completion status

### Credential Renewal (Coordinator-Managed)
1. System sends email alert at 90 days before expiration
2. Coordinator notifies staff member
3. Staff provides updated documentation
4. Coordinator uploads new document
5. Coordinator updates expiration date
6. System marks credential as active

### Credential Renewal (Staff Self-Service - Phase 2)
1. Staff receives email alert at 90 days
2. Staff logs in, sees upcoming expiration
3. Staff completes renewal and uploads new certificate
4. Submission goes to coordinator for verification
5. Coordinator reviews and approves
6. System updates status automatically

### Traveler Onboarding
1. Coordinator creates staff record with "Traveler" type
2. Contract start/end dates entered
3. Coordinator verifies all required credentials
4. System tracks both credentials AND contract dates
5. Alert sent before contract end for extension decision

### Adding New Compliance Requirement
1. Hospital announces new mandatory training
2. Coordinator creates new Credential Type
3. Sets requirements (renewal period, who it applies to)
4. System auto-assigns to applicable staff
5. All staff now tracked for new requirement

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| RCIS | Registered Cardiovascular Invasive Specialist |
| RCES | Registered Cardiac Electrophysiology Specialist |
| CCI | Cardiovascular Credentialing International |
| CEU | Continuing Education Unit |
| Compact License | Multi-state nursing license (Nurse Licensure Compact) |
| Competency | Demonstrated ability to perform specific skill |
| Credential | Umbrella term for licenses, certifications, competencies |

---

*Document Version: 1.0*  
*Created: [Date]*  
*Last Updated: [Date]*
