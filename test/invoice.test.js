const test = require('node:test');
const assert = require('node:assert/strict');
const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');
const reports = require('../lib/reports');

// Keep the same monetary fields and line items that routes/orders.js saves.
function bill(items, coupon = '') {
  const checkout = pricing.computeTotals(items, coupon);
  const { subtotal, discount, tax, total } = checkout;
  const order = { id: 1, items, coupon, subtotal, discount, tax, total };
  return { checkout, order, printed: invoice.computeInvoiceFigures(order) };
}

function amounts({ discount, tax, cgst, sgst, total }) {
  return { discount, tax, cgst, sgst, total };
}

test('An odd paisa is allocated to the same GST component as checkout', () => {
  const { checkout, printed, order } = bill([{ name: 'Tea', hsn: '0902', price: 10.05, qty: 1 }]);
  const expected = { discount: 0, tax: 1.81, cgst: 0.91, sgst: 0.9, total: 11.86 };
  assert.deepEqual(amounts(checkout), expected);
  assert.deepEqual(amounts(printed), expected);
  assert.doesNotMatch(invoice.render(order), /Accountant Reconciliation Notice/);
});

test('Printed rows retain the 5% and 12% HSN slabs', () => {
  const { checkout, printed, order } = bill([
    { name: 'Rice', hsn: '1006', price: 50, qty: 2 },
    { name: 'Ghee', hsn: '0405', price: 100, qty: 1 }
  ]);
  assert.deepEqual(checkout.lines.map(line => [line.gstPercent, line.tax]), [[5, 5], [12, 12]]);
  assert.deepEqual(printed.rows.map(row => [row.gstPercent, row.lineTax]), [[5, 5], [12, 12]]);
  assert.deepEqual(amounts(checkout), { discount: 0, tax: 17, cgst: 8.5, sgst: 8.5, total: 217 });
  assert.deepEqual(amounts(printed), amounts(checkout));

  const html = invoice.render(order);
  assert.match(html, /CGST \+ SGST \(Total GST\)<\/td><td[^>]*>₹17\.00/);
  assert.match(html, /Invoice Total<\/td><td[^>]*>₹217\.00/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});

test('SAVE10 matches the billed total and GST in reconciliation', () => {
  const { checkout, printed, order } = bill([{ name: 'Tea', hsn: '0902', price: 500, qty: 1 }], 'SAVE10');
  assert.deepEqual(amounts(checkout), { discount: 50, tax: 81, cgst: 40.5, sgst: 40.5, total: 531 });
  assert.deepEqual(amounts(printed), amounts(checkout));
  assert.doesNotMatch(invoice.render(order), /Accountant Reconciliation Notice/);
  const report = reports.getGstReconciliation({ orders: [order] });
  assert.equal(report.mismatchCount, 0);
  assert.equal(report.rows[0].delta, 0);
});

test('Printed SAVE10 discount respects the ₹150 checkout cap', () => {
  const { checkout, printed } = bill([{ name: 'Tea', hsn: '0902', price: 2000, qty: 1 }], 'SAVE10');
  assert.deepEqual(amounts(checkout), { discount: 150, tax: 333, cgst: 166.5, sgst: 166.5, total: 2183 });
  assert.deepEqual(amounts(printed), amounts(checkout));
});

test('FLAT50 reduces the taxable amount on the invoice', () => {
  const { checkout, printed } = bill([{ name: 'Tea', hsn: '0902', price: 300, qty: 1 }], 'FLAT50');
  assert.deepEqual(amounts(checkout), { discount: 50, tax: 45, cgst: 22.5, sgst: 22.5, total: 295 });
  assert.deepEqual(amounts(printed), amounts(checkout));
});

test('Invoice GST sums rounded line taxes', () => {
  const { checkout, printed } = bill([
    { name: 'A', price: 0.03, qty: 1, gstRate: 18 },
    { name: 'B', price: 0.03, qty: 1, gstRate: 18 }
  ]);
  assert.deepEqual(printed.rows.map(row => row.lineTax), [0.01, 0.01]);
  assert.equal(checkout.tax, 0.02);
  assert.equal(printed.tax, 0.02);
  assert.equal(checkout.total, 0.08);
  assert.equal(printed.total, 0.08);
});

test('A saved 12% GST rate without a coupon produces matching checkout and invoice figures', () => {
  const { checkout, printed } = bill([{ name: 'Ghee', price: 75, qty: 2, gstRate: 12 }]);
  const expected = { discount: 0, tax: 18, cgst: 9, sgst: 9, total: 168 };
  assert.equal(printed.subtotal, 150);
  assert.equal(printed.rows[0].gstPercent, 12);
  assert.deepEqual(amounts(checkout), expected);
  assert.deepEqual(amounts(printed), expected);
});

test('Discounted rice invoice matches the billed total and 5% GST', () => {
  const { printed } = bill([{ name: 'Rice', hsn: '1006', price: 640, qty: 1 }], 'SAVE10');
  assert.deepEqual(amounts(printed), { discount: 64, tax: 28.8, cgst: 14.4, sgst: 14.4, total: 604.8 });
  assert.equal(printed.rows[0].lineTax, 28.8);
});
