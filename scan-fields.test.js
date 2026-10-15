import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEstimateText } from './scan-fields.js';

test('recognizable sheet labels map to editable job fields', () => {
  const { fields, detected } = parseEstimateText(`Name: Sample Residence    Number: 555-0100
Address: 123 Maple Street
City: Portland
Email: test@example.com
Notes: Direct drainage away from foundation
Style: 6K
Color: White
D.S.: corr 3x4
Total Gutters: 320
Total D.S.: 105
Cuts: 44
Roof Pitch: 12/12
Date: 9/28/26
Price $ 2,345
Totals 2,814.00`);
  assert.equal(fields.customer, 'Sample Residence');
  assert.equal(fields.phone, '555-0100');
  assert.equal(fields.address, '123 Maple Street');
  assert.equal(fields.city, 'Portland');
  assert.equal(fields.value, 2814);
  assert.equal(fields.gutterFt, 320);
  assert.equal(fields.downspoutFt, 105);
  assert.equal(fields.type, '6" K-style');
  assert.equal(fields.ds, 'ds-34');
  assert.equal(fields.date, '2026-09-28');
  assert.equal(fields.cuts, 44);
  assert.equal(fields.roofPitch, '12/12');
  assert.ok(detected.includes('value'));
});

test('missing or unreadable handwriting stays blank rather than being guessed', () => {
  const { fields } = parseEstimateText('5" K Gutter   6" K Gutter\nStyle: ???\nPrice: unreadable\nTotal Gutters: /');
  assert.equal(fields.customer, '');
  assert.equal(fields.value, '');
  assert.equal(fields.type, '');
  assert.equal(fields.gutterFt, '');
  assert.equal(fields.tearOff, '');
  assert.equal(fields.elbows, '');
});

test('invalid calendar dates are not suggested and header choices do not select material size', () => {
  const { fields } = parseEstimateText('Date: 2/30/26\n5" K Gutter\n6" K Gutter\nGutter Ft: 256\nD.S. Ft: 125\nTotal Price $ 1,990.00');
  assert.equal(fields.date, '');
  assert.equal(fields.type, '');
  assert.equal(fields.gutterFt, 256);
  assert.equal(fields.downspoutFt, 125);
  assert.equal(fields.value, 1990);
});
