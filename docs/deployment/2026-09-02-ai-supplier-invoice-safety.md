# Safety boundary

The smart supplier-invoice flow stops at draft creation. It does not post journal entries, approve supplier payments, or bypass purchasing/accounting permissions. Supplier creation and invoice creation are explicit authorized-user actions and reuse the existing authenticated server functions.
