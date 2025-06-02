import { Timestamp } from "firebase/firestore";

/**
 * Represents a single cryptocurrency transaction.
 */
export interface Transaction {
  id?: string; // Firestore document ID, optional on creation
  userId: string; // Firebase Auth UID of the user who owns this transaction
  type: "buy" | "sell";
  coinId: string; // From CoinGecko, e.g., "bitcoin"
  coinSymbol: string; // E.g., "BTC"
  coinName: string; // E.g., "Bitcoin"
  date: Timestamp; // The date and time of the transaction
  quantity: number; // Amount of cryptocurrency bought/sold
  pricePerCoin: number; // Price per coin in currencyAtTransaction
  currencyAtTransaction: string; // Currency used for this transaction (e.g., "USD", "EUR", "SEK")
  exchange?: string; // Name of the exchange where the transaction occurred (optional)
  fees?: number; // Transaction fees in currencyAtTransaction (optional)
  notes?: string; // Optional, user notes for the transaction
  createdAt?: Timestamp; // Timestamp of when the document was created
  updatedAt?: Timestamp; // Timestamp of when the document was last updated
}

/**
 * Represents user-specific portfolio settings or profile data.
 * The document ID for this in Firestore would typically be the Firebase Auth UID.
 */
export interface UserPortfolio {
  uid: string; // Firebase Auth UID, primary key for the users collection
  email?: string | null; // User's email
  displayName?: string | null; // User's display name
  photoURL?: string | null; // URL of the user's profile picture
  preferredCurrency: string; // User's default currency for display (e.g., "USD", "EUR", "SEK")
  createdAt?: Timestamp; // Timestamp of when the user profile was created
  lastLogin?: Timestamp; // Timestamp of the user's last login
  // Potentially add other user-specific settings or summary data here in the future
}
