const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const compiled = ts.transpileModule(fs.readFileSync('lib/razorpay.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const context = { exports: {}, process, Buffer, require: name => name === 'server-only' ? {} : require(name) };
vm.runInNewContext(compiled, context);
const { verifyCheckoutSignature, paymentAmountInPaise } = context.exports;
const secret = 'unit-test-secret-not-a-credential';
const signature = crypto.createHmac('sha256', secret).update('order_test|pay_test').digest('hex');
assert.equal(verifyCheckoutSignature('order_test', 'pay_test', signature, secret), true);
assert.equal(verifyCheckoutSignature('order_wrong', 'pay_test', signature, secret), false);
assert.equal(verifyCheckoutSignature('order_test', 'pay_wrong', signature, secret), false);
assert.equal(verifyCheckoutSignature('order_test', 'pay_test', signature + 'garbage', secret), false);
assert.equal(verifyCheckoutSignature('order_test', 'pay_test', 'zz'.repeat(32), secret), false);
assert.equal(verifyCheckoutSignature('order_test', 'pay_test', '', secret), false);
assert.equal(paymentAmountInPaise('1.00'), 100);
assert.equal(paymentAmountInPaise(586), 58600);
for (const value of [0, -1, 0.99, NaN, Infinity, 'abc']) assert.throws(() => paymentAmountInPaise(value));
console.log('PASS signature, tampering, malformed signatures and minimum amount');

async function main() {
  const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const send = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  for (const path of ['/api/payments/create-razorpay-order', '/api/payments/verify']) {
    for (const body of ['{', '{}', 'null']) {
      assert.equal((await send(path, body)).status, 400, path + ' malformed input');
    }
  }
  assert.equal((await send('/api/payments/create-razorpay-order', JSON.stringify({ orderId: '11111111-1111-4111-8111-111111111111' }))).status, 401);
  assert.equal((await send('/api/payments/verify', JSON.stringify({ orderId: '11111111-1111-4111-8111-111111111111', razorpay_order_id: 'order_test', razorpay_payment_id: 'pay_test', razorpay_signature: signature }))).status, 401);
  console.log('PASS malformed request (400) and unauthenticated request (401) endpoints');
  if (process.argv.includes('--gateway')) {
    require('@next/env').loadEnvConfig(process.cwd());
    assert.ok(process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_'), 'Refusing gateway smoke test with live keys');
    const Razorpay = require('razorpay');
    const client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const order = await client.orders.create({ amount: 100, currency: 'INR', receipt: 'integration-check-' + Date.now(), notes: { purpose: 'Integration smoke test only; no payment' } });
    assert.equal(order.amount, 100);
    assert.equal(order.currency, 'INR');
    assert.equal(order.status, 'created');
    console.log('PASS test-mode Razorpay API order creation (100 paise); no payment made');
  }
}
main().catch(error => {
  // SDK errors can contain authentication headers; never dump the object.
  console.error('FAIL', error?.statusCode ? `Gateway status ${error.statusCode}` : error.message);
  process.exitCode = 1;
});
