'use client';

import React, { useState } from 'react';
import { FeeInvoice, PaymentMethod } from '@/types';
import { recordPayment } from '@/lib/repositories/feeInvoices';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: FeeInvoice;
  onPaymentRecorded: (updatedInvoice: FeeInvoice) => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const { session } = useSession();
  const { showToast } = useToast();

  const netDue = invoice.totalAmount - invoice.discountAmount;
  const currentBalance = Math.max(0, netDue - invoice.paidAmount);

  // Form states
  const [amountStr, setAmountStr] = useState<string>(String(currentBalance));
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const enteredAmount = parseFloat(amountStr) || 0;
  const newBalance = Math.max(0, currentBalance - enteredAmount);
  const isFullPayment = enteredAmount >= currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (enteredAmount <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid amount',
        message: 'Payment amount must be greater than zero.',
      });
      return;
    }

    if (enteredAmount > currentBalance) {
      showToast({
        type: 'error',
        title: 'Amount exceeds balance',
        message: `Amount cannot exceed remaining balance of ${formatCurrency(currentBalance)}.`,
      });
      return;
    }

    if ((method === 'bank' || method === 'cheque') && !reference.trim()) {
      showToast({
        type: 'error',
        title: 'Reference required',
        message: `Please provide a transaction reference or cheque number for ${method} payments.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await recordPayment(invoice.id, {
        amount: enteredAmount,
        method,
        reference: reference.trim() || undefined,
        receivedBy: session?.userId || 'usr_admin',
        receivedAt: new Date(paymentDate).toISOString(),
      });

      showToast({
        type: 'success',
        title: 'Payment recorded',
        message: `Recorded ${formatCurrency(enteredAmount)} payment. Invoice is now ${updated.status}.`,
      });

      onPaymentRecorded(updated);
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Recording failed',
        message: err instanceof Error ? err.message : 'Failed to record payment.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-lg">
              💳
            </div>
            <div>
              <h2 id="payment-modal-title" className="text-lg font-bold text-neutral-900">
                Record Payment
              </h2>
              <p className="text-xs text-neutral-500 font-mono">
                {invoice.invoiceNumber} • Remaining Balance: {formatCurrency(currentBalance)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick Balance Presets */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Payment Amount (PKR) <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setAmountStr(String(currentBalance))}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                Pay Full Balance ({formatCurrency(currentBalance)})
              </button>
              <button
                type="button"
                onClick={() => setAmountStr(String(Math.round(currentBalance / 2)))}
                className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                50% ({formatCurrency(Math.round(currentBalance / 2))})
              </button>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-neutral-400">
                PKR
              </span>
              <input
                type="number"
                min="1"
                max={currentBalance}
                step="100"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-300 bg-white pl-12 pr-3 py-2 text-sm font-semibold text-neutral-900 focus:border-purple-500 focus:outline-hidden tabular-nums"
                placeholder="0"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'bank', 'cheque'] as PaymentMethod[]).map((m) => (
                <label
                  key={m}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border cursor-pointer text-xs font-semibold transition-all ${
                    method === m
                      ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-2xs'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m}
                    checked={method === m}
                    onChange={() => setMethod(m)}
                    className="sr-only"
                  />
                  <span className="text-base mb-0.5">
                    {m === 'cash' ? '💵' : m === 'bank' ? '🏦' : '📝'}
                  </span>
                  <span className="capitalize">{m}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reference Number (Bank / Cheque) */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Reference / Note{' '}
              {method !== 'cash' ? (
                <span className="text-rose-500">*</span>
              ) : (
                <span className="text-neutral-400 font-normal">(Optional)</span>
              )}
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={
                method === 'bank'
                  ? 'Bank transaction ID / deposit slip #'
                  : method === 'cheque'
                  ? 'Cheque # and issuing bank'
                  : 'Cash receipt note or teller info'
              }
              required={method !== 'cash'}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-purple-500 focus:outline-hidden"
            />
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-purple-500 focus:outline-hidden"
            />
          </div>

          {/* Calculation Preview Banner */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Current Invoice Balance:</span>
              <span className="tabular-nums font-medium">{formatCurrency(currentBalance)}</span>
            </div>
            <div className="flex justify-between font-semibold text-emerald-800">
              <span>Payment Amount:</span>
              <span className="tabular-nums">-{formatCurrency(enteredAmount)}</span>
            </div>
            <div className="border-t border-neutral-200 pt-1.5 flex justify-between font-bold text-neutral-900">
              <span>Remaining Balance After Payment:</span>
              <span className="tabular-nums">{formatCurrency(newBalance)}</span>
            </div>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-neutral-500 text-2xs">Updated Invoice Status:</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold ${
                  isFullPayment
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {isFullPayment ? '✓ Fully Paid' : '⏱ Partially Paid'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={enteredAmount <= 0 || enteredAmount > currentBalance || submitting}
            >
              {submitting
                ? 'Recording...'
                : `Confirm & Record ${formatCurrency(enteredAmount)}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
