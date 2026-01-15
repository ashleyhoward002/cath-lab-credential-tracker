const db = require('./database');

console.log('Checking users in database...\n');

db.all('SELECT id, username, display_name, role FROM users', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Users found:', rows.length);
    rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Name: ${user.display_name}, Role: ${user.role}`);
    });
  }

  // Test password for coordinator
  db.get('SELECT password_hash FROM users WHERE username = ?', ['coordinator'], (err, row) => {
    if (err) {
      console.error('Error getting coordinator:', err);
    } else if (row) {
      console.log('\nCoordinator password hash exists:', row.password_hash.substring(0, 20) + '...');
    } else {
      console.log('\nCoordinator user not found!');
    }
    process.exit(0);
  });
});
