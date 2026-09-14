'use client';

import React, { useState } from 'react';
import { FeeInvoice } from '@/types';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/components/shell/NavIcon';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils/currency';

export interface OnlinePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: FeeInvoice;
}

export function OnlinePaymentModal({ isOpen, onClose, invoice }: OnlinePaymentModalProps) {
  const { showToast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<'easypaisa' | 'jazzcash' | 'bank' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const netDue = Math.max(0, invoice.totalAmount - invoice.discountAmount);
  const remaining = Math.max(0, netDue - invoice.paidAmount);

  const handlePay = () => {
    if (!selectedMethod) {
      showToast({ title: 'Please select a payment method', type: 'error' });
      return;
    }

    setIsProcessing(true);

    // Simulate API call for prototype
    setTimeout(() => {
      setIsProcessing(false);
      showToast({
        title: 'Payment processing',
        message: `Your payment of ${formatCurrency(remaining)} via ${selectedMethod} has been initiated. (Prototype)`,
        type: 'success',
      });
      onClose();
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-start bg-black/50 p-4 sm:p-6 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 my-auto shrink-0">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Pay Online</h3>
            <p className="text-xs text-neutral-500">Invoice {invoice.invoiceNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <NavIcon name="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-center">
          <span className="text-xs font-semibold text-neutral-500 block mb-1">Amount to Pay</span>
          <span className="text-3xl font-black font-mono text-neutral-900">
            {formatCurrency(remaining)}
          </span>
        </div>

        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-bold text-neutral-900">Select Payment Method</h4>
          
          <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${selectedMethod === 'easypaisa' ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500' : 'border-neutral-200 hover:border-neutral-300'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <NavIcon name="smartphone" className="w-5 h-5" />
              </div>
              <span className="font-bold text-neutral-900">EasyPaisa</span>
            </div>
            <input 
              type="radio" 
              name="paymentMethod" 
              value="easypaisa" 
              checked={selectedMethod === 'easypaisa'}
              onChange={() => setSelectedMethod('easypaisa')}
              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-neutral-300"
            />
          </label>

          <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${selectedMethod === 'jazzcash' ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-500' : 'border-neutral-200 hover:border-neutral-300'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700">
                <NavIcon name="smartphone" className="w-5 h-5" />
              </div>
              <span className="font-bold text-neutral-900">JazzCash</span>
            </div>
            <input 
              type="radio" 
              name="paymentMethod" 
              value="jazzcash" 
              checked={selectedMethod === 'jazzcash'}
              onChange={() => setSelectedMethod('jazzcash')}
              className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-neutral-300"
            />
          </label>

          <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${selectedMethod === 'bank' ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-neutral-200 hover:border-neutral-300'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                <NavIcon name="credit-card" className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-neutral-900">Any Bank</span>
                <span className="text-xs text-neutral-500">Credit / Debit Card</span>
              </div>
            </div>
            <input 
              type="radio" 
              name="paymentMethod" 
              value="bank" 
              checked={selectedMethod === 'bank'}
              onChange={() => setSelectedMethod('bank')}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-neutral-300"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handlePay} isLoading={isProcessing} disabled={!selectedMethod}>
            Proceed to Pay
          </Button>
        </div>
      </div>
    </div>
  );
}
