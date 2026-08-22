async function testLogin() {
  const res = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@pecsummit.com',
      password: 'PecSummit@2026',
    }),
  });

  const status = res.status;
  const json = await res.json();
  console.log('HTTP Status:', status);
  console.log('User Role:', json?.user?.role);
  console.log('User Name:', json?.user?.name);
  console.log('Access Token Length:', json?.accessToken?.length);
}

testLogin();
