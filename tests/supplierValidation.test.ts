import test from "node:test"
import assert from "node:assert/strict"
import {
  isValidBankAccountNumber,
  isValidIndonesianWaNumber,
  normalizeWaNumber,
  validateSupplierContactFields,
} from "../src/lib/supplierValidation"

test("normalizeWaNumber mengubah +62/62 menjadi awalan 0", () => {
  assert.equal(normalizeWaNumber("+6281234567890"), "081234567890")
  assert.equal(normalizeWaNumber("6281234567890"), "081234567890")
  assert.equal(normalizeWaNumber("081234567890"), "081234567890")
})

test("isValidIndonesianWaNumber menerima format seluler Indonesia yang wajar", () => {
  assert.equal(isValidIndonesianWaNumber("081234567890"), true)
  assert.equal(isValidIndonesianWaNumber("+6281234567890"), true)
  assert.equal(isValidIndonesianWaNumber("62812345678901"), true)
})

test("isValidIndonesianWaNumber menolak format yang tidak wajar", () => {
  assert.equal(isValidIndonesianWaNumber("12345"), false)
  assert.equal(isValidIndonesianWaNumber("0212345678"), false)
  assert.equal(isValidIndonesianWaNumber("abcdefghij"), false)
})

test("isValidBankAccountNumber menerima 5-20 digit, boleh berspasi/strip", () => {
  assert.equal(isValidBankAccountNumber("1234567890"), true)
  assert.equal(isValidBankAccountNumber("1234-5678-90"), true)
  assert.equal(isValidBankAccountNumber("123"), false)
  assert.equal(isValidBankAccountNumber("123456789012345678901"), false)
})

test("validateSupplierContactFields lolos untuk field kosong (opsional)", () => {
  assert.equal(validateSupplierContactFields({}), null)
  assert.equal(validateSupplierContactFields({ kontak_wa: "", nomor_rekening: "" }), null)
})

test("validateSupplierContactFields menolak WA/rekening tidak valid", () => {
  assert.match(validateSupplierContactFields({ kontak_wa: "12345" }) ?? "", /WA/)
  assert.match(validateSupplierContactFields({ nomor_rekening: "12" }) ?? "", /rekening/)
})
