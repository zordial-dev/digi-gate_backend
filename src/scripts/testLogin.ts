async function testLogin() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@digigate.com',
        password: '123456'
      })
    });
    const data = await res.json();
    console.log('--- ADMIN LOGIN ---');
    console.log('Status:', res.status);
    console.log('Data:', data);

    const orgRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'zordial@digigate.com',
        password: '123456'
      })
    });
    const orgData = await orgRes.json();
    console.log('--- ZORDIAL LOGIN ---');
    console.log('Status:', orgRes.status);
    console.log('Data:', orgData);

    process.exit(0);
  } catch (err: any) {
    console.error('--- LOGIN ERROR ---', err);
    process.exit(1);
  }
}

testLogin();
