async function testAdminOrgs() {
  try {
    const res = await fetch('http://localhost:5000/api/admin/organisations');
    const data = await res.json();
    console.log('--- ADMIN ORGANISATIONS ENDPOINT ---');
    console.log('Status:', res.status);
    console.log('Data:', data);
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testAdminOrgs();
