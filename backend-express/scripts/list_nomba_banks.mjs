import 'dotenv/config';

async function main(){
  try{
    const BASE = (process.env.NOMBA_ENV === 'production') ? 'https://api.nomba.com' : 'https://sandbox.nomba.com';
    const parent = process.env.NOMBA_PARENT_ACCOUNT_ID;
    const clientId = process.env.NOMBA_CLIENT_ID;
    const clientSecret = process.env.NOMBA_CLIENT_SECRET;

    if(!parent || !clientId || !clientSecret){
      console.error('Missing Nomba credentials in .env. Please set NOMBA_PARENT_ACCOUNT_ID, NOMBA_CLIENT_ID, NOMBA_CLIENT_SECRET');
      process.exit(2);
    }

    const tokenRes = await fetch(`${BASE}/v1/auth/token/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accountId: parent },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    });

    const tokenPayload = await tokenRes.json();
    if(!tokenRes.ok || !tokenPayload?.data?.access_token){
      console.error('Failed to obtain access token from Nomba:', JSON.stringify(tokenPayload, null, 2));
      process.exit(3);
    }
    const token = tokenPayload.data.access_token;

    const banksRes = await fetch(`${BASE}/v1/transfers/banks`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', accountId: parent },
    });

    const banksPayload = await banksRes.json();
    if(!banksRes.ok){
      console.error('Failed to fetch banks:', JSON.stringify(banksPayload, null, 2));
      process.exit(4);
    }

    const banks = banksPayload?.data ?? banksPayload;
    if(!Array.isArray(banks)){
      console.error('Unexpected bank response shape:', JSON.stringify(banksPayload, null, 2));
      process.exit(5);
    }

    console.log('# Nomba Banks (first 50)');
    banks.slice(0,50).forEach((b, i) => {
      const code = b.code ?? b.bank_code ?? b.BankCode ?? b.bankCode ?? '(no-code)';
      const name = b.name ?? b.bank_name ?? b.BankName ?? b.bankName ?? '(no-name)';
      console.log(`${i+1}. ${code} — ${name}`);
    });

    if(banks.length===0) console.log('No banks returned.');
  }catch(err){
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
