async function test() {
  try {
    const res1 = await fetch('http://localhost:5000/api/organisations/ZORDIAL');
    const data1 = await res1.json();
    console.log('Result for /api/organisations/ZORDIAL:', res1.status, data1);
  } catch (err: any) {
    console.error('Error for ZORDIAL:', err.message);
  }

  try {
    const res2 = await fetch('http://localhost:5000/api/organisations/code/ZORDIAL');
    const data2 = await res2.json();
    console.log('Result for /api/organisations/code/ZORDIAL:', res2.status, data2);
  } catch (err: any) {
    console.error('Error for /code/ZORDIAL:', err.message);
  }

  try {
    const res3 = await fetch('http://localhost:5000/api/organisations/6');
    const data3 = await res3.json();
    console.log('Result for /api/organisations/6:', res3.status, data3);
  } catch (err: any) {
    console.error('Error for /6:', err.message);
  }
}

test();
