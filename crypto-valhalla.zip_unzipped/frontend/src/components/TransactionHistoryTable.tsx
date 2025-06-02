import React, { useEffect, useState } from "react";
import { firebaseApp, useCurrentUser } from "app";
import { getFirestore, collection, query, where, orderBy, onSnapshot, Timestamp, doc, deleteDoc } from "firebase/firestore"; // Added doc and deleteDoc
import { Transaction } from "utils/firestoreTypes";
import { EditTransactionForm } from "./EditTransactionForm";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Added AlertDialog imports
import { Button } from "@/components/ui/button";
import { Edit3, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const db = getFirestore(firebaseApp);

interface TransactionWithId extends Transaction {
  id: string;
}

export const TransactionHistoryTable: React.FC = () => {
  const { user } = useCurrentUser();
  const [transactions, setTransactions] = useState<TransactionWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingTransaction, setEditingTransaction] = useState<TransactionWithId | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // State for delete confirmation
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithId | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setError("User not logged in. Cannot fetch transactions.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const transactionsCol = collection(db, `users/${user.uid}/transactions`);
    const q = query(transactionsCol, orderBy("date", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedTransactions: TransactionWithId[] = [];
        querySnapshot.forEach((doc) => {
          fetchedTransactions.push({ id: doc.id, ...doc.data() } as TransactionWithId);
        });
        setTransactions(fetchedTransactions);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching transactions:", err);
        setError("Failed to fetch transactions. Please try again later.");
        toast.error("Could not load your transaction history.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleEditClick = (transaction: TransactionWithId) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingTransaction(null);
  };

  const handleEditCancel = () => {
    setIsEditDialogOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteClick = (transaction: TransactionWithId) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete || !user) {
      toast.error("Could not delete transaction. Missing information.");
      return;
    }
    setIsDeleting(true);
    try {
      const transactionDocRef = doc(db, `users/${user.uid}/transactions`, transactionToDelete.id);
      await deleteDoc(transactionDocRef);
      toast.success("Transaction deleted successfully!");
      handleCancelDelete(); // Close dialog and clear selection
    } catch (err) {
      console.error("Error deleting transaction:", err);
      toast.error("Failed to delete transaction. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading transactions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (transactions.length === 0 && !isLoading) { // ensure not to show if still loading
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No transactions found.</p>
        <p className="text-sm text-muted-foreground">
          Add your first transaction using the button above.
        </p>
      </div>
    );
  }

  const formatNumber = (num: number | undefined | null, decimals = 2) => {
    if (num === undefined || num === null) return "-";
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  return (
    <>
      <Table>
        <TableCaption>A list of your recent cryptocurrency transactions.</TableCaption>
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
            <TableHead className="text-center">Actions</TableHead>
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
              <TableCell>{tx.coinName} ({tx.coinSymbol.toUpperCase()})</TableCell>
              <TableCell className="text-right">{formatNumber(tx.quantity, 6)}</TableCell>
              <TableCell className="text-right">{formatNumber(tx.pricePerCoin)} {tx.currencyAtTransaction}</TableCell>
              <TableCell className="text-right">{formatNumber(tx.quantity * tx.pricePerCoin)} {tx.currencyAtTransaction}</TableCell>
              <TableCell>{tx.exchange || "-"}</TableCell>
              <TableCell className="text-right">{formatNumber(tx.fees)} {tx.fees ? tx.currencyAtTransaction : ""}</TableCell>
              <TableCell className="text-center">
                <Button variant="ghost" size="icon" className="mr-1" onClick={() => handleEditClick(tx)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => handleDeleteClick(tx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingTransaction && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <EditTransactionForm 
                transaction={editingTransaction} 
                onSuccess={handleEditSuccess} 
                onCancel={handleEditCancel} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {transactionToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this transaction
                from your records.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDelete} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
