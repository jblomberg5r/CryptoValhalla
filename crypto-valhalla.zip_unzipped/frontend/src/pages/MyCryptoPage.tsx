import React from "react"; // Removed useState
import PortfolioSummaryDashboard from "../components/PortfolioSummaryDashboard";
import { AddTransactionForm } from "../components/AddTransactionForm";
import { useUserGuardContext } from "app";
// Removed Button, Dialog and PlusCircle imports as AddTransactionForm will be inline
import { TransactionHistoryTable } from "components/TransactionHistoryTable";
import { toast } from "sonner"; // For success notifications

const MyCryptoPage = () => {
  const { user } = useUserGuardContext();
  // Removed isAddTransactionOpen state

  if (!user) {
    return (
      <div className="container mx-auto p-4 pt-20 text-center">
        <p>Please log in to view your portfolio.</p>
      </div>
    );
  }

  const handleTransactionAdded = () => {
    toast.success("Transaction added successfully!");
    // TODO: Optionally, trigger a refresh of portfolio data here
    // For example, by refetching transactions for PortfolioSummaryDashboard or TransactionHistoryTable
  };

  return (
    <div className="container mx-auto p-4 pt-6 md:pt-10 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          My Crypto Portfolio
        </h1>
        {/* Dialog and Trigger Button removed */}
      </div>

      {/* Render AddTransactionForm directly */}
      <div className="mb-12 bg-card p-6 rounded-lg shadow-md pb-10">
        <h2 className="text-xl font-semibold text-card-foreground mb-6">
            Add New Transaction
        </h2>
        <AddTransactionForm onSuccess={handleTransactionAdded} />
      </div>

      <PortfolioSummaryDashboard />
      
      <div className="mt-12">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-6">Transaction History</h2>
        <TransactionHistoryTable />
      </div>
    </div>
  );
};

export default MyCryptoPage;
