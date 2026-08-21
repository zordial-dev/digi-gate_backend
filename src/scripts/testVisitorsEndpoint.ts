async function testVisitorsEndpoint() {
  try {
    const res = await fetch('http://localhost:5000/api/organisations/6/visitors?page=1&limit=10');
    const data = await res.json();
    console.log('--- VISITORS ENDPOINT RESPONSE ---');
    console.log('Status Code:', res.status);
    console.log('Response Body:', data);
    process.exit(0);
  } catch (err: any) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testVisitorsEndpoint();
