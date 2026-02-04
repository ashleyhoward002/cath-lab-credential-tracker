const { pool } = require('./database');

const credentialTypes = [
  { name: 'RN License - Michigan', category: 'License', issuing_body: 'Michigan Board of Nursing', renewal_period_months: 24, ceu_requirement: 0, required_for: 'RN', is_required: true, alert_days: '90,60,30,14,7', verification_required: true, allow_multiple: false, instructions: 'Must maintain active RN license in Michigan' },
  { name: 'Compact Nursing License', category: 'License', issuing_body: 'State Board of Nursing', renewal_period_months: 24, ceu_requirement: 0, required_for: 'RN', is_required: false, alert_days: '90,60,30,14,7', verification_required: true, allow_multiple: true, instructions: 'Multi-state nursing license for travelers' },
  { name: 'Radiologic Technologist License', category: 'License', issuing_body: 'State Licensing Board', renewal_period_months: 24, ceu_requirement: 24, required_for: 'RT', is_required: true, alert_days: '90,60,30,14,7', verification_required: true, allow_multiple: false, instructions: 'Required for all Radiologic Technologists' },
  { name: 'RCIS Certification', category: 'Certification', issuing_body: 'Cardiovascular Credentialing International (CCI)', renewal_period_months: 24, ceu_requirement: 16, required_for: 'Tech', is_required: true, alert_days: '90,60,30,14,7', verification_required: true, allow_multiple: false, instructions: 'Registered Cardiovascular Invasive Specialist - requires 16 CEUs per cycle' },
  { name: 'RCES Certification', category: 'Certification', issuing_body: 'Cardiovascular Credentialing International (CCI)', renewal_period_months: 24, ceu_requirement: 16, required_for: 'EP Tech', is_required: false, alert_days: '90,60,30,14,7', verification_required: true, allow_multiple: false, instructions: 'Registered Cardiac Electrophysiology Specialist - requires 16 CEUs per cycle' },
  { name: 'ACLS', category: 'Certification', issuing_body: 'American Heart Association', renewal_period_months: 24, ceu_requirement: 0, required_for: 'All', is_required: true, alert_days: '90,60,30,14,7', verification_required: true, allow_multiple: false, instructions: 'Advanced Cardiac Life Support - required for all staff' },
  { name: 'BLS', category: 'Certification', issuing_body: 'American Heart Association', renewal_period_months: 24, ceu_requirement: 0, required_for: 'All', is_required: true, alert_days: '90,60,30,14,7', verification_required: true, allow_multiple: false, instructions: 'Basic Life Support - required for all staff' },
  { name: 'PALS', category: 'Certification', issuing_body: 'American Heart Association', renewal_period_months: 24, ceu_requirement: 0, required_for: 'RN', is_required: false, alert_days: '90,60,30,14,7', verification_required: true, allow_multiple: false, instructions: 'Pediatric Advanced Life Support - required if performing pediatric cases' },
  { name: 'NIHSS Certification', category: 'Certification', issuing_body: 'Hospital/Facility', renewal_period_months: 12, ceu_requirement: 0, required_for: 'Custom', is_required: false, alert_days: '60,30,14,7', verification_required: true, allow_multiple: false, instructions: 'NIH Stroke Scale - required if performing stroke cases' },
  { name: 'Conscious Sedation', category: 'Competency', issuing_body: 'Hospital', renewal_period_months: 12, ceu_requirement: 0, required_for: 'RN', is_required: true, alert_days: '60,30,14', verification_required: true, allow_multiple: false, instructions: 'Annual competency for moderate sedation' },
  { name: 'Arterial/Venous Sheath Removal', category: 'Competency', issuing_body: 'Hospital', renewal_period_months: 12, ceu_requirement: 0, required_for: 'RN,Tech', is_required: true, alert_days: '60,30,14', verification_required: true, allow_multiple: false, instructions: 'Annual competency validation required' },
  { name: 'Hemodynamic Monitoring', category: 'Competency', issuing_body: 'Hospital', renewal_period_months: 12, ceu_requirement: 0, required_for: 'All', is_required: true, alert_days: '60,30,14', verification_required: true, allow_multiple: false, instructions: 'Annual competency for all cath lab staff' },
  { name: 'Radiation Safety', category: 'Competency', issuing_body: 'Hospital', renewal_period_months: 12, ceu_requirement: 0, required_for: 'All', is_required: true, alert_days: '60,30,14', verification_required: true, allow_multiple: false, instructions: 'Annual radiation safety training required' },
  { name: 'Emergency Response', category: 'Competency', issuing_body: 'Hospital', renewal_period_months: 12, ceu_requirement: 0, required_for: 'All', is_required: true, alert_days: '60,30,14', verification_required: true, allow_multiple: false, instructions: 'Code Blue and emergency procedures' },
  { name: 'HIPAA Training', category: 'Other', issuing_body: 'Hospital', renewal_period_months: 12, ceu_requirement: 0, required_for: 'All', is_required: true, alert_days: '60,30,14', verification_required: true, allow_multiple: false, instructions: 'Annual HIPAA compliance training' },
  { name: 'Fire Safety', category: 'Other', issuing_body: 'Hospital', renewal_period_months: 12, ceu_requirement: 0, required_for: 'All', is_required: true, alert_days: '60,30,14', verification_required: true, allow_multiple: false, instructions: 'Annual fire safety training' },
  { name: 'Bloodborne Pathogens', category: 'Other', issuing_body: 'Hospital', renewal_period_months: 12, ceu_requirement: 0, required_for: 'All', is_required: true, alert_days: '60,30,14', verification_required: true, allow_multiple: false, instructions: 'Annual bloodborne pathogen training' },
];

const sampleStaff = [
  { employee_id: 'EMP001', first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.johnson@hospital.com', phone: '555-0101', role: 'RN', employment_type: 'Permanent', hire_date: '2020-03-15', home_state: 'MI', status: 'Active' },
  { employee_id: 'EMP002', first_name: 'Michael', last_name: 'Chen', email: 'michael.chen@hospital.com', phone: '555-0102', role: 'Tech', employment_type: 'Permanent', hire_date: '2019-08-22', home_state: 'MI', status: 'Active' },
  { employee_id: 'EMP003', first_name: 'Emily', last_name: 'Rodriguez', email: 'emily.rodriguez@hospital.com', phone: '555-0103', role: 'RN', employment_type: 'Permanent', hire_date: '2021-01-10', home_state: 'MI', status: 'Active' },
  { employee_id: 'EMP004', first_name: 'David', last_name: 'Williams', email: 'david.williams@hospital.com', phone: '555-0104', role: 'RT', employment_type: 'Permanent', hire_date: '2018-06-05', home_state: 'MI', status: 'Active' },
  { employee_id: 'TEMP001', first_name: 'Jessica', last_name: 'Martinez', email: 'jessica.martinez@agency.com', phone: '555-0201', role: 'RN', employment_type: 'Traveler', hire_date: '2025-11-15', contract_start_date: '2025-11-15', contract_end_date: '2026-02-15', agency_name: 'Travel Nurses Inc', home_state: 'OH', status: 'Active' },
  { employee_id: 'TEMP002', first_name: 'Robert', last_name: 'Taylor', email: 'robert.taylor@agency.com', phone: '555-0202', role: 'Tech', employment_type: 'Traveler', hire_date: '2025-12-01', contract_start_date: '2025-12-01', contract_end_date: '2026-03-01', agency_name: 'Healthcare Staffing Solutions', home_state: 'IN', status: 'Active' },
];

async function seedCredentialTypes() {
  for (const ct of credentialTypes) {
    await pool.query(
      `INSERT INTO credential_types
       (name, category, issuing_body, renewal_period_months, ceu_requirement,
        required_for, is_required, alert_days, verification_required, allow_multiple, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (name) DO NOTHING`,
      [ct.name, ct.category, ct.issuing_body, ct.renewal_period_months,
       ct.ceu_requirement, ct.required_for, ct.is_required, ct.alert_days,
       ct.verification_required, ct.allow_multiple, ct.instructions]
    );
  }
  console.log('Credential types seeded');
}

async function seedSampleStaff() {
  for (const s of sampleStaff) {
    await pool.query(
      `INSERT INTO staff_members
       (employee_id, first_name, last_name, email, phone, role, employment_type,
        hire_date, contract_start_date, contract_end_date, agency_name, home_state, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (employee_id) DO NOTHING`,
      [s.employee_id, s.first_name, s.last_name, s.email, s.phone, s.role,
       s.employment_type, s.hire_date, s.contract_start_date || null,
       s.contract_end_date || null, s.agency_name || null, s.home_state, s.status]
    );
  }
  console.log('Sample staff seeded');
}

async function seedDatabase() {
  try {
    await seedCredentialTypes();
    await seedSampleStaff();
    console.log('Database seeded successfully');
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}

module.exports = { seedDatabase };
