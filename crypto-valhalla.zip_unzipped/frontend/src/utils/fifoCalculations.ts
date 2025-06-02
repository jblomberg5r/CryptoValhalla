import { Transaction } from "./firestoreTypes"; // Assuming Transaction type is defined here

export interface FifoShareLot {
  quantity: number;
  pricePerCoin: number; // Cost basis per coin in this lot
  currencyAtTransaction: string; // Currency of this lot's cost basis
  date: Date; // Date of acquisition for this lot
}

export interface FifoCalculationResult {
  realizedPnL: number; // Total realized profit or loss in the target currency
  remainingShares: FifoShareLot[]; // Shares still held, with their original cost basis
  costOfRemainingShares: number; // Total cost basis of remaining shares in target currency
  processedSellTransactions: number; // Count of sell transactions fully or partially processed
}

/**
 * Calculates realized Profit and Loss (P&L) using the FIFO (First-In, First-Out) method
 * for a series of transactions for a single asset.
 *
 * IMPORTANT: This function assumes transactions are for a SINGLE asset and are pre-sorted by date ASCENDING.
 * It also assumes all transaction prices and quantities are positive.
 * Conversion to a common target currency for P&L calculation is handled if buy/sell currencies differ,
 * but this requires a simplified assumption if direct exchange rates at transaction times are not available.
 * For now, it assumes P&L is calculated based on the `pricePerCoin` fields directly if they are in the same currency,
 * or requires a spot conversion rate if they differ (not implemented in this version, assumes same currency for P&L).
 *
 * @param transactions - An array of Transaction objects for a single asset, sorted by date.
 * @param targetReportingCurrency - The currency in which the P&L should be reported. (Currently, this function primarily works if transaction currencies are consistent or P&L is interpreted in original transaction currency if mixed. True multi-currency P&L needs historical rates.)
 * @returns FifoCalculationResult object containing realized P&L and remaining shares.
 */
export const calculateFifoPnl = (
  transactions: Transaction[],
  targetReportingCurrency: string // TODO: Implement proper currency conversion using historical rates
): FifoCalculationResult => {
  let realizedPnL = 0;
  const buyLots: FifoShareLot[] = [];
  let processedSellTransactions = 0;

  for (const t of transactions) {
    if (t.type === "buy") {
      buyLots.push({
        quantity: t.quantity,
        pricePerCoin: t.pricePerCoin,
        currencyAtTransaction: t.currencyAtTransaction, // Store original currency
        date: t.date instanceof Date ? t.date : t.date.toDate(), // Ensure it's a Date object
      });
    } else if (t.type === "sell") {
      let sellQuantityRemaining = t.quantity;
      processedSellTransactions++;

      while (sellQuantityRemaining > 0 && buyLots.length > 0) {
        const earliestLot = buyLots[0];
        
        // For simplicity, this version assumes P&L is calculated based on numeric values of pricePerCoin.
        // A robust solution needs to handle currency conversions if earliestLot.currencyAtTransaction !== t.currencyAtTransaction
        // and both are different from targetReportingCurrency. We will assume for now they are compatible or PnL is in t.currency
        // For now, if currencies don't match, this PnL might be misleading. 
        // This is a BIG simplification.
        if (earliestLot.currencyAtTransaction !== t.currencyAtTransaction) {
            console.warn(
                `FIFO P&L: Currency mismatch between buy lot (${earliestLot.currencyAtTransaction}) and sell transaction (${t.currencyAtTransaction}). P&L calculation will assume direct numeric comparison, which might be incorrect. Asset: ${t.coinName}`
            );
            // Ideally, convert earliestLot.pricePerCoin to t.currencyAtTransaction using historical rate at t.date
            // Or convert both to targetReportingCurrency
        }

        const quantityToProcess = Math.min(sellQuantityRemaining, earliestLot.quantity);
        
        const costForThisPortion = quantityToProcess * earliestLot.pricePerCoin;
        const proceedsForThisPortion = quantityToProcess * t.pricePerCoin;
        
        realizedPnL += (proceedsForThisPortion - costForThisPortion);
        
        earliestLot.quantity -= quantityToProcess;
        sellQuantityRemaining -= quantityToProcess;

        if (earliestLot.quantity <= 0.00000001) { // Use a small epsilon for float comparison
          buyLots.shift(); // Remove depleted lot
        }
      }

      if (sellQuantityRemaining > 0.00000001) {
        // This case implies selling more shares than available (short selling or data issue)
        // For this basic FIFO, we might log a warning or error as it's outside typical long-only portfolio tracking.
        console.warn(
          `FIFO P&L: Sell quantity for ${t.coinName} (${t.quantity}) exceeds available buy lots. ${sellQuantityRemaining} units could not be matched. This may indicate a data issue or short sale not tracked by this FIFO logic.`
        );
        // Optionally, could represent this as a negative P&L against a zero cost basis if short selling is intended,
        // but that complicates the definition of "realized" P&L without a covering buy.
      }
    }
  }

  // Calculate total cost of remaining shares
  // Again, assumes conversion to targetReportingCurrency is needed for a meaningful sum if currencies differ.
  // Current sum is naive if currencies are mixed.
  let costOfRemainingShares = 0;
  buyLots.forEach(lot => {
    if (lot.currencyAtTransaction !== targetReportingCurrency) {
        console.warn(
            `FIFO Cost: Currency mismatch for remaining lot of ${lot.quantity} ${transactions[0]?.coinName || 'unknown asset'} (${lot.currencyAtTransaction}) vs target reporting currency (${targetReportingCurrency}). Cost sum might be incorrect.`
        );
        // Ideally, convert lot.pricePerCoin to targetReportingCurrency using historical rate at lot.date
    }
    costOfRemainingShares += lot.quantity * lot.pricePerCoin; 
  });

  return {
    realizedPnL,
    remainingShares: buyLots,
    costOfRemainingShares, // This sum is naive if buyLots have mixed currencies not matching targetReportingCurrency
    processedSellTransactions,
  };
};

// Example Usage (for testing purposes, typically you'd call this from your component):
/*
const exampleTransactions: Transaction[] = [
  { id: '1', coinId: 'bitcoin', coinName: 'Bitcoin', coinSymbol: 'BTC', type: 'buy', quantity: 2, pricePerCoin: 10000, currencyAtTransaction: 'USD', date: new Date('2023-01-01'), userId: 'user1', exchange: 'Coinbase', fees: 10 },
  { id: '2', coinId: 'bitcoin', coinName: 'Bitcoin', coinSymbol: 'BTC', type: 'buy', quantity: 1, pricePerCoin: 12000, currencyAtTransaction: 'USD', date: new Date('2023-01-15'), userId: 'user1', exchange: 'Coinbase', fees: 5 },
  { id: '3', coinId: 'bitcoin', coinName: 'Bitcoin', coinSymbol: 'BTC', type: 'sell', quantity: 1.5, pricePerCoin: 15000, currencyAtTransaction: 'USD', date: new Date('2023-02-01'), userId: 'user1', exchange: 'Coinbase', fees: 7 },
  { id: '4', coinId: 'bitcoin', coinName: 'Bitcoin', coinSymbol: 'BTC', type: 'buy', quantity: 0.5, pricePerCoin: 11000, currencyAtTransaction: 'USD', date: new Date('2023-02-10'), userId: 'user1', exchange: 'Coinbase', fees: 3 },
  { id: '5', coinId: 'bitcoin', coinName: 'Bitcoin', coinSymbol: 'BTC', type: 'sell', quantity: 1.5, pricePerCoin: 18000, currencyAtTransaction: 'USD', date: new Date('2023-03-01'), userId: 'user1', exchange: 'Coinbase', fees: 8 },
];

const result = calculateFifoPnl(exampleTransactions, 'USD');
console.log('FIFO P&L Result:', result);
// Expected P&L:
// Sell 1: 1.5 BTC
//   1 BTC from Lot 1 (cost 10000) -> P&L = 1 * (15000 - 10000) = 5000
//   0.5 BTC from Lot 1 (cost 10000) -> P&L = 0.5 * (15000 - 10000) = 2500
//   Total for Sell 1 = 7500. Remaining Lot 1: 0.5 BTC @ 10000. Lot 2: 1 BTC @ 12000
// Sell 2: 1.5 BTC
//   0.5 BTC from Lot 1 (cost 10000) -> P&L = 0.5 * (18000 - 10000) = 4000
//   1 BTC from Lot 2 (cost 12000) -> P&L = 1 * (18000 - 12000) = 6000
//   Total for Sell 2 = 10000. Lot 1 depleted. Lot 2 depleted.
// Total Realized P&L = 7500 + 10000 = 17500
// Remaining Shares: 0.5 BTC from Lot 3 (cost 11000)
// Cost of Remaining: 0.5 * 11000 = 5500

// P&L for sell 1: (1.5 * 15000) - (1 * 10000 + 0.5 * 10000) = 22500 - 15000 = 7500
// Remaining: Lot1: 0.5 @ 10k, Lot2: 1 @ 12k
// P&L for sell 2: (1.5 * 18000) - (0.5 * 10000 + 1 * 12000) = 27000 - (5000 + 12000) = 27000 - 17000 = 10000
// Total P&L = 7500 + 10000 = 17500.
// Remaining after sell 2: Lot3: 0.5 @ 11k (cost 5500)

*/
