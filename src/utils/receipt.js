const generateReceiptText = (payment, loan, user) => {
  const border = '='.repeat(45);
  const divider = '-'.repeat(45);
  
  const paymentAmount = parseFloat(payment.amount);
  const principalShare = paymentAmount * 0.79;
  const interestShare = paymentAmount * 0.17;
  const feesShare = paymentAmount * 0.04;

  return `${border}
            HIDEL FINANCE SERVICES
           EMI REPAYMENT RECEIPT
${border}
Receipt Date:   ${payment.date}
Receipt ID:     REC-${payment.transactionReference || payment.id}
Transaction ID: ${payment.transactionReference || payment.id}
Status:         SUCCESSFUL (PAID)
${divider}
CUSTOMER INFORMATION:
Customer Name:  ${user?.name || 'Aarav Shah'}
Customer ID:    ${user?.customerId || 'NV-48211'}
Email Address:  ${user?.email || 'aarav.shah@example.com'}

LOAN DETAILS:
Loan Reference: ${loan?.loanReference || 'LN-48211'}
Loan Type:      ${loan?.type || 'Personal Loan'}
Interest Rate:  ${loan?.interestRate || 8.4}% Fixed APR

TRANSACTION DETAILS:
EMI installment: #${payment.emiNo}
Payment Method:  ${payment.method}
Total Amount:    INR ${paymentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

Breakdown:
  - Principal:   INR ${principalShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
  - Interest:    INR ${interestShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
  - Fees & Misc: INR ${feesShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
${divider}
Disclaimer:
This is a computer-generated transaction receipt and 
does not require a physical signature. For support, 
please contact support@novafin.example.
${border}
Thank you for banking with Hidel Finance.
`;
};

module.exports = {
  generateReceiptText,
};
