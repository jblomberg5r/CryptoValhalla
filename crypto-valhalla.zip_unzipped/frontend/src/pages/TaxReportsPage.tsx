import React, { useState, useEffect } from "react";
import { firebaseApp, useCurrentUser } from "app";
import { getFirestore, collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Added Table imports
import { Transaction } from "utils/firestoreTypes";
import { Loader2 } from "lucide-react";
import { format } from "date-fns"; // For date formatting
import { cn } from "@/lib/utils"; // For conditional classnames

const db = getFirestore(firebaseApp);

interface TransactionWithId extends Transaction {
  id: string;
}

// Helper function to format numbers, can be moved to a utils file later
const formatNumber = (num: number | undefined | null, decimals = 2, currencySymbol = "") => {
  if (num === undefined || num === null) return "-";
  return `${currencySymbol}${num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

const TaxReportsPage = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState<string>(
    currentYear.toString()
  );
  const [transactions, setTransactions] = useState<TransactionWithId[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [errorTransactions, setErrorTransactions] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !selectedYear) {
      setTransactions([]);
      return;
    }

    setIsLoadingTransactions(true);
    setErrorTransactions(null);

    const yearNumber = parseInt(selectedYear, 10);
    const startDate = Timestamp.fromDate(new Date(yearNumber, 0, 1, 0, 0, 0));
    const endDate = Timestamp.fromDate(new Date(yearNumber, 11, 31, 23, 59, 59));

    const transactionsCol = collection(db, `users/${user.uid}/transactions`);
    const q = query(
      transactionsCol,
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedTransactions: TransactionWithId[] = [];
        querySnapshot.forEach((doc) => {
          fetchedTransactions.push({ id: doc.id, ...doc.data() } as TransactionWithId);
        });
        setTransactions(fetchedTransactions);
        setIsLoadingTransactions(false);
      },
      (err) => {
        console.error(`Error fetching transactions for year ${selectedYear}:`, err);
        setErrorTransactions(`Failed to fetch transactions for ${selectedYear}.`);
        setIsLoadingTransactions(false);
      }
    );

    return () => unsubscribe();
  }, [user, selectedYear]);

  return (
    <div className="container mx-auto p-4 pt-6 md:pt-10 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Tax Reports
        </h1>
        <div className="w-full sm:w-auto min-w-[180px]">
          <Select 
            value={selectedYear} 
            onValueChange={setSelectedYear}
            disabled={userLoading || isLoadingTransactions}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-card-foreground mb-6">
          Transaction Report for {selectedYear}
        </h2>
        {userLoading && <p className="text-center py-10 text-muted-foreground">Loading user information...</p>}
        {!user && !userLoading && <p className="text-center py-10 text-muted-foreground">Please log in to view your tax reports.</p>}
        
        {user && isLoadingTransactions && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading transactions for {selectedYear}...</p>
          </div>
        )}
        {user && errorTransactions && (
          <div className="text-center py-10 text-destructive">
            <p>{errorTransactions}</p>
          </div>
        )}
        {user && !isLoadingTransactions && !errorTransactions && transactions.length === 0 && (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No transactions found for {selectedYear}.</p>
          </div>
        )}
        {user && !isLoadingTransactions && !errorTransactions && transactions.length > 0 && (
          <Table>
            <TableCaption>Transactions for the year {selectedYear}.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Coin</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price/Coin</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Exchange</TableHead>
                <TableHead className="text-right">Fees</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{format(tx.date.toDate(), "MMM d, yyyy HH:mm")}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-medium capitalize px-2 py-0.5 rounded-full text-xs",
                        tx.type === "buy" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      )}
                    >
                      {tx.type}
                    </span>
                  </TableCell>
                  <TableCell>{tx.coinName} ({tx.coinSymbol?.toUpperCase()})</TableCell>
                  <TableCell className="text-right">{formatNumber(tx.quantity, 6)}</TableCell>
                  <TableCell className="text-right">{formatNumber(tx.pricePerCoin, 2, tx.currencyAtTransaction + " ")}</TableCell>
                  <TableCell className="text-right">{formatNumber(tx.quantity * tx.pricePerCoin, 2, tx.currencyAtTransaction + " ")}</TableCell>
                  <TableCell>{tx.exchange || "-"}</TableCell>
                  <TableCell className="text-right">{formatNumber(tx.fees, 2, tx.fees ? tx.currencyAtTransaction + " " : "")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          // TODO: MYA-15.4: Calculate Capital Gains/Losses (FIFO) - this will go below or in a new section
        )}
      </div>
    </div>
  );
};

export default TaxReportsPage;
