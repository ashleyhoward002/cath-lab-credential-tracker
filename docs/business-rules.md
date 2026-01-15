# Cath Lab Credential Tracker - Design Decisions

This document answers the clarifying questions to finalize the application specification.

---

## Core Functionality Decisions

### 1. Credential Status Auto-Calculation

**Question:** How should status transitions work?

**Decisions:**

| Setting | Decision | Rationale |
|---------|----------|-----------|
| "Expiring Soon" threshold | **Configurable per credential type**, default 90 days | Some credentials (like annual training) may only need 30-day warning, while licenses may need 90 days |
| Auto-transition to "Expired" | **Yes, automatically at midnight on expiration date** | Removes manual work; status should always reflect reality |
| Status calculation | **Real-time based on current date vs. expiration date** | No batch jobs needed for status; always accurate |

**Status Logic:**
```
If expiration_date < today → "Expired"
Else if expiration_date <= today + alert_threshold → "Expiring Soon"  
Else if expiration_date exists and is future → "Active"
Else if manually set → "Pending", "Waived", or "N/A"
```

---

### 2. CEU Application Logic

**Question:** When CEUs apply to multiple credentials, do hours count toward all or get divided?

**Decision:** **Same hours count toward ALL selected credentials**

**Rationale:** This matches how CEUs actually work. If you attend a 2-hour cardiac rhythm course, those 2 hours count toward both your RCIS renewal AND your RCES renewal—you don't split them. CCI and other credentialing bodies allow the same CEUs to apply to multiple certifications.

---

### 3. Credential Assignment for New Types

**Question:** When a new required credential type is created, what happens?

**Decision:** **Prompt coordinator with option to bulk-assign to existing staff**

**Workflow:**
1. Coordinator creates new credential type (e.g., "New Hospital Mandatory Training")
2. Sets "Required For: All" (or specific roles)
3. System prompts: "This credential applies to 35 staff members. Assign now?"
4. Options: "Assign to All Matching" / "Assign Manually Later"
5. If bulk assigned, all get status "Pending" until dates entered

**Rationale:** Gives coordinator control while making bulk assignment easy. Avoids surprise assignments without awareness.

---

### 4. Waived Status Rules

**Question:** How should waivers work?

**Decisions:**

| Setting | Decision | Rationale |
|---------|----------|-----------|
| Waiver expiration | **Optional expiration date** | Some waivers are temporary (e.g., during FMLA), others permanent (e.g., role doesn't require it) |
| Approval workflow | **Coordinator applies directly** (Phase 1) | Keep it simple for now; you're the only one managing it |
| Compliance percentage | **Waived credentials are EXCLUDED from calculation** | A waived credential shouldn't count against compliance |
| Required fields when waiving | **Reason (required), Expiration date (optional), Approved by (auto-filled)** | Documentation for audits |

---

## Data & Business Rules

### 5. Duplicate Credentials (Multi-State Licenses)

**Question:** Can a staff member have multiple of the same credential type?

**Decision:** **Yes, allow multiple instances**

**Use Cases:**
- RN with licenses in multiple states (Michigan + Ohio for border staff)
- Traveler with compact license PLUS additional single-state license
- Staff with both RCIS and RCES

**Implementation:** Each credential record is unique. Credential type can be flagged as "Allow Multiple" or "Single Only."

---

### 6. Historical Data on Renewal

**Question:** Keep history or just update?

**Decision:** **Maintain full history**

**Rationale:** Critical for audits. Joint Commission may ask "Was this person credentialed on March 15th?" You need to prove they were.

**Implementation:**
- Never delete credential records, only add new ones
- Each record has Issue Date and Expiration Date
- When renewed, create NEW record with new dates
- Previous record marked as "Superseded" (not deleted)
- History view shows all records chronologically

---

### 7. Expiration Date Calculation

**Question:** When auto-calculated vs. manual?

**Decisions:**

| Scenario | Behavior |
|----------|----------|
| Credential type has standard renewal period | **Auto-calculate** (Issue Date + Renewal Period) |
| Coordinator enters expiration date manually | **Use manual date** (override auto-calc) |
| State license with specific expiration | **Manual entry required** (varies by state) |
| ACLS/BLS with known 2-year period | **Auto-calculate**, but allow override |

**UI:** Show calculated date but allow edit field. If coordinator changes it, use their value.

---

### 8. Employment Type Changes

**Question:** What happens to credentials if Permanent → Traveler or vice versa?

**Decision:** **Credentials remain unchanged**

**Rationale:** A credential is a credential—it doesn't matter if the person is permanent or traveler. The employment type is metadata about the person, not their qualifications.

**What does change:**
- If changing TO Traveler: System prompts to add contract dates
- If changing FROM Traveler to Permanent: Contract dates become inactive (not deleted, for history)
- Credential requirements stay based on Role, not employment type

---

### 8b. Traveler Contract Tracking

**Context:** Travelers typically stay 6 weeks to 1 year

**Contract Date Alerts:**
| Alert | Timing | Purpose |
|-------|--------|---------|
| Contract ending soon | 30 days before end date | Time to extend or plan replacement |
| Contract ending | 14 days before end date | Final reminder |
| Contract ended | Day of end date | Prompt to extend, archive, or convert to permanent |

**Traveler Dashboard Widget:**
```
┌─────────────────────────────────────────────────────────────┐
│ TRAVELER CONTRACTS                                          │
├─────────────────────────────────────────────────────────────┤
│ 🟡 Sarah Chen, RN    │ Contract ends: 01/25/2026 │ 18 days │
│ 🟢 Mike Torres, Tech │ Contract ends: 04/15/2026 │ 98 days │
│ 🟢 Lisa Park, RN     │ Contract ends: 06/30/2026 │ 174 days│
└─────────────────────────────────────────────────────────────┘
```

**Contract Status Colors:**
- 🟢 Green: More than 30 days remaining
- 🟡 Yellow: 30 days or less remaining
- 🔴 Red: Contract ended (still in system, needs action)

**Traveler Record Fields:**
| Field | Required? |
|-------|-----------|
| Contract Start Date | Yes |
| Contract End Date | Yes |
| Agency Name | Optional |
| Agency Contact | Optional |
| Original Contract Length | Auto-calculated |
| Extension Count | Auto-tracked |
| Home State (for license verification) | Yes |

**Actions When Contract Ends:**
- Prompt coordinator with options:
  - "Extend Contract" → Enter new end date
  - "Convert to Permanent" → Remove contract dates, change employment type
  - "Archive" → Move to archived staff

---

## Notifications & Alerts

### 9. Email Timing

**Question:** What time of day? Batch job?

**Decisions:**

| Setting | Decision |
|---------|----------|
| Send time | **7:00 AM local time** |
| Batch job | **Daily at 6:00 AM** - calculates all due alerts, queues emails |
| Coordinator digest | **Option for single daily email** with all upcoming expirations vs. individual emails |

**Rationale:** Morning delivery gives time to act during workday. Digest option prevents inbox overload.

---

### 10. Failed Notification Handling

**Question:** What if email fails?

**Decisions:**

| Setting | Decision |
|---------|----------|
| Retry logic | **Retry 3 times over 24 hours** |
| Fallback | **Log failure, flag in dashboard** (no SMS in Phase 1) |
| Logging | **Record all send attempts** (timestamp, status, error message) |
| Dashboard indicator | **Show "⚠️ Notification failed" on staff record** |

**Phase 2 consideration:** Add SMS option for critical alerts

---

### 11. Reminder Suppression

**Question:** Do reminders continue after expiration?

**Decision:** **Yes, continue with escalation**

**Logic:**
- Before expiration: Standard reminders (90, 60, 30, 14, 7 days)
- Day of expiration: "EXPIRES TODAY" alert
- After expiration: Weekly reminder for first month, then flag for coordinator action
- Coordinator can "snooze" or "acknowledge" to stop repeat alerts

**Rationale:** Don't let expired credentials fall off the radar. The coordinator needs to resolve it—either get renewal or document exception.

---

## Reporting & Dashboard

### 12. Compliance Percentage Calculation

**Question:** How is it calculated?

**Decision:**

```
Compliance % = (Active Credentials) / (Total Required - Waived - N/A) × 100
```

**Detailed Logic:**

| Status | Included in Numerator? | Included in Denominator? |
|--------|------------------------|--------------------------|
| Active | ✅ Yes | ✅ Yes |
| Expiring Soon | ✅ Yes (still valid) | ✅ Yes |
| Expired | ❌ No | ✅ Yes |
| Pending | ❌ No | ✅ Yes |
| Waived | ➖ Excluded | ➖ Excluded |
| N/A | ➖ Excluded | ➖ Excluded |

**Example:** Staff member with 10 required credentials, 1 waived, 8 active, 1 expired
- Denominator: 10 - 1 = 9
- Numerator: 8
- Compliance: 8/9 = 89%

---

### 12b. Color-Coded Status Display

**Decision:** Use traffic light color system for visual scanning

| Status | Color | Compliant? | When |
|--------|-------|------------|------|
| Active | 🟢 **Green** | ✅ Yes | More than 30 days until expiration |
| Expiring Soon (31-90 days) | 🟢 **Green** | ✅ Yes | 31-90 days out (just shows in alerts) |
| Expiring Soon (≤30 days) | 🟡 **Yellow/Amber** | ✅ Yes | 30 days or less until expiration |
| Expired | 🔴 **Red** | ❌ No | Past expiration date |
| Pending | 🔵 **Blue** or ⚪ **Gray** | ❌ No | Not yet obtained |
| Waived | ⚪ **Gray** | ➖ N/A | Excluded from tracking |
| N/A | ⚪ **Gray** | ➖ N/A | Excluded from tracking |

**Dashboard Color Logic:**
- Individual credential badges show the color of that credential's status
- Staff member row shows their "worst" status color:
  - Any 🔴 Red → Row is Red
  - No Red but any 🟡 Yellow → Row is Yellow  
  - All Green/Gray → Row is Green
- Department compliance widget shows overall health

**Visual Example:**
```
┌─────────────────────────────────────────────────────────────┐
│ STAFF ROSTER                                                │
├─────────────────────────────────────────────────────────────┤
│ 🟢 Jane Smith, RN      │ 12/12 compliant │ ▸ View Details  │
│ 🟡 John Doe, Tech      │ 11/12 compliant │ RCIS expires 21d│
│ 🔴 Mary Johnson, RN    │ 10/12 compliant │ BLS EXPIRED     │
│ 🟢 Bob Wilson, RT      │ 14/14 compliant │ ▸ View Details  │
└─────────────────────────────────────────────────────────────┘
```

**Individual Staff View:**
```
┌─────────────────────────────────────────────────────────────┐
│ John Doe, Cath Lab Tech                                     │
├─────────────────────────────────────────────────────────────┤
│ 🟢 ACLS           │ Expires: 08/15/2026 │ 196 days │       │
│ 🟢 BLS            │ Expires: 03/22/2026 │ 74 days  │       │
│ 🟡 RCIS           │ Expires: 01/28/2026 │ 21 days  │ ⚠️    │
│ 🟢 Radiation Safety│ Expires: 11/01/2026 │ 298 days │       │
│ 🔴 HIPAA Training │ EXPIRED 12/31/2025  │ -7 days  │ ‼️    │
└─────────────────────────────────────────────────────────────┘
```

---

### 13. Dashboard Performance

**Question:** Performance expectations?

**Decisions:**

| Metric | Target |
|--------|--------|
| Dashboard initial load | **< 3 seconds** |
| Staff list load (35 people) | **< 2 seconds** |
| Report generation | **< 10 seconds** |
| Search results | **< 1 second** |

**Note:** With 35 staff × ~15 credentials each = ~525 records. This is small; performance won't be an issue with any reasonable technology choice.

---

## User Experience

### 14. Bulk Operations (Phase 1)

**Question:** What bulk operations are needed?

**Priority for Phase 1:**

| Operation | Priority | Use Case |
|-----------|----------|----------|
| Bulk credential assignment | **High** | New annual requirement for all staff |
| Bulk reminder send | **High** | "Send reminder to all expiring in 30 days" |
| Bulk status update | **Medium** | After skills fair, mark 20 people complete |
| Bulk document upload | **Low** (Phase 2) | Complex UX, defer |

---

### 15. Search Functionality

**Question:** What search capabilities?

**Phase 1:**

| Feature | Include? |
|---------|----------|
| Global search (staff name, credential) | ✅ Yes |
| Filter by credential type | ✅ Yes |
| Filter by status | ✅ Yes |
| Filter by role | ✅ Yes |
| Filter by employment type | ✅ Yes |
| Combined filters | ✅ Yes |
| Save filter as "view" | ❌ Phase 2 |

**Search behavior:** As-you-type filtering, searches name + employee ID

---

### 16. Sorting Preferences

**Question:** Save user preferences?

**Decision:** **No for Phase 1** (single coordinator), **Yes for Phase 2** (multiple users)

**Rationale:** With one coordinator, browser will remember. When multiple users, save per-user preferences.

---

## Technical & Security

### 17. Document Storage

**Question:** Database, file system, or cloud?

**Recommendation:** Depends on hosting environment

| If hosted... | Store documents... | Rationale |
|--------------|-------------------|-----------|
| Hospital on-premise | File system with database reference | Keeps PHI in-house |
| Cloud (AWS/Azure) | Cloud storage (S3/Azure Blob) | Scalable, automatic backups |
| Low-code (Power Apps) | SharePoint or Dataverse | Integrated with platform |

**Requirements regardless:**
- Encryption at rest
- Access logging
- Organized folder structure: `/staff/{employee_id}/{credential_type}/`
- File naming: `{lastname}_{credential}_{expdate}.pdf`

---

### 18. Audit Trail Granularity

**Question:** What to log?

**Phase 1 Logging:**

| Event | Log? | Details Captured |
|-------|------|------------------|
| Credential status change | ✅ Yes | Old value, new value, who, when |
| Expiration date change | ✅ Yes | Old date, new date, who, when |
| Document upload | ✅ Yes | Filename, who, when |
| Staff record edit | ✅ Yes | Fields changed, who, when |
| User login | ✅ Yes | Who, when, success/fail |
| Report generation | ❌ No (Phase 2) | Not critical initially |
| Document view/download | ❌ No (Phase 2) | Nice for security audit |

---

### 19. Data Retention

**Question:** How long to keep archived records?

**Decision:** **7 years minimum, indefinite preferred**

**Rationale:** 
- Joint Commission can look back 3 years
- Legal/malpractice considerations can go back further
- Storage is cheap; keep everything
- Archived records are hidden from default views but queryable

**Implementation:**
- "Archive" doesn't delete, just hides from active views
- "Archived Staff" section for lookup
- No automatic purge (manual only with admin approval)

---

### 20. Concurrent Editing

**Question:** Two coordinators editing same record?

**Decision:** **Last write wins with warning** (Phase 1), **Locking** (Phase 2)

**Phase 1 Implementation:**
- When saving, check if record was modified since page load
- If yes, show warning: "This record was modified by [other user] at [time]. Your changes will overwrite. Continue?"
- Display what changed so coordinator can decide

**Rationale:** With 1-2 coordinators and infrequent edits, conflicts are rare. Simple solution is fine for MVP.

---

## Phase 1 MVP Scope Clarification

### 21. Pending Verifications Feature

**Question:** Is this Phase 1 or Phase 2?

**Decision:** **Include basic version in Phase 1**

**Phase 1 scope:**
- Coordinator uploads document
- Coordinator marks as "Verified" (checkbox + date)
- Dashboard shows "Unverified documents" count
- Not a workflow, just a flag

**Phase 2 scope:**
- Staff submits document
- Goes into coordinator queue
- Approval/rejection workflow
- Automated status update on approval

---

### 22. Minimum Viable Reports

**Phase 1 (Essential):**

| Report | Rationale |
|--------|-----------|
| Expiration Report (next 30/60/90 days) | Core daily use |
| Individual Staff Summary | Personnel file, audits |
| Overall Compliance Summary | Leadership visibility |
| Expired Credentials Report | Action list |

**Phase 2 (Nice to Have):**

| Report | Rationale |
|--------|-----------|
| Credential Type Report | Useful but not daily need |
| Traveler Status Report | Can filter main list for now |
| Historical Audit Report | For deep compliance review |
| CEU Progress Report | Depends on CEU module |
| Trend Reports | Requires historical data accumulation |

---

## Summary of Key Decisions

| Area | Key Decision |
|------|--------------|
| Status | Auto-calculated in real-time, configurable thresholds |
| **Status colors** | 🟢 Green (>30 days), 🟡 Yellow (≤30 days), 🔴 Red (expired) |
| **Expiring = Compliant** | Yes, still counts as compliant until actually expired |
| CEUs | Same hours count toward all applicable credentials |
| New credential types | Prompt for bulk assignment to existing staff |
| Waivers | Optional expiration, excluded from compliance % |
| Multi-state licenses | Allow multiple credentials of same type |
| History | Keep full history, never delete |
| Reminders | Continue after expiration with escalation |
| **Email timing** | 7:00 AM daily |
| Compliance % | Active / (Required - Waived - N/A) |
| **Traveler contracts** | Track separately, 30/14 day alerts before contract end |
| Bulk operations | Assignment and reminders in Phase 1 |
| Audit logging | All credential and status changes |
| Data retention | 7+ years, no auto-purge |
| Concurrent edits | Last write wins with warning |

---

## Confirmed Decisions ✅

| Decision | Status | Notes |
|----------|--------|-------|
| CEUs count toward ALL applicable credentials | ✅ Confirmed | |
| Keep full credential history (never delete) | ✅ Confirmed | |
| Reminders continue after expiration | ✅ Confirmed | |
| Waivers excluded from compliance percentage | ✅ Confirmed | |
| 7-year minimum data retention | ✅ Confirmed | |
| Email alerts at 7:00 AM | ✅ Confirmed | |
| Expiring Soon (≤30 days) = Yellow, still compliant | ✅ Confirmed | |
| Expired = Red, not compliant | ✅ Confirmed | |
| Traveler contract alerts at 30/14 days | ✅ Confirmed | Typical stay: 6 weeks to 1 year |
| Phase 1 reports: Expiration, Individual Summary, Compliance, Expired list | ✅ Confirmed | |

---

## Ready for Development

These two documents together provide a complete specification:
1. **cath-lab-credential-tracker-spec.md** - Overall system design
2. **credential-tracker-decisions.md** - Detailed business rules (this document)

Feed both to Claude Code to begin building.
