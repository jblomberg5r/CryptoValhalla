import React, { useEffect, useState, useMemo } from 'react';
import { useUserGuardContext } from 'app';
import { useCurrentCurrency } from '../utils/currencyStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { firebaseApp } from "app";
import { getFirestore, collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { Transaction } from "../utils/firestoreTypes";
import brain from "brain";
import { MarketData } from "types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, PieChart as PieChartIcon, TrendingUp, TrendingDown, DollarSign, Info } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { calculateFifoPnl } from "../utils/fifoCalculations";

interface Holding {
  coinId: string;
  coinName: string;
  coinSymbol: string;
  quantity: number;
}

const NORDIC_COLORS = [
  "#5E81AC", "#88C0D0", "#81A1C1", "#B48EAD",
  "#A3BE8C", "#EBCB8B", "#D08770", "#BF616A",
];

const PortfolioSummaryDashboard = () => {
  const { user } = useUserGuardContext();
  const { currency } = useCurrentCurrency();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, MarketData>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);

  const [totalValue, setTotalValue] = useState<number | null>(null);
  const [isLoadingValue, setIsLoadingValue] = useState(true);
  const [valueError, setValueError] = useState<string | null>(null);

  const [totalRealizedPnL, setTotalRealizedPnL] = useState<number | null>(null);
  const [isLoadingPnL, setIsLoadingPnL] = useState(true);
  const [pnlError, setPnLError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoadingTransactions(false);
      setTransactionsError("User not authenticated. Please log in.");
      setIsLoadingPrices(false); 
      setIsLoadingValue(false);
      setIsLoadingPnL(false); 
      return;
    }
    setIsLoadingTransactions(true);
    setTransactionsError(null);
    const db = getFirestore(firebaseApp);
    const transactionsCol = collection(db, `users/${user.uid}/transactions`);
    const q = query(transactionsCol, orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const fetchedTransactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
          fetchedTransactions.push({ id: doc.id, ...data, date } as Transaction);
        });
        setTransactions(fetchedTransactions);
        setIsLoadingTransactions(false);
      },
      (error) => {
        console.error("Error fetching transactions: ", error);
        setTransactionsError(`Failed to load transactions: ${error.message}`);
        setIsLoadingTransactions(false);
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (isLoadingTransactions || transactionsError) {
      setHoldings([]);
      return;
    }
    const netHoldings: Record<string, { quantity: number; name: string; symbol: string }> = {};
    transactions.forEach(t => {
      if (!netHoldings[t.coinId]) {
        netHoldings[t.coinId] = { quantity: 0, name: t.coinName, symbol: t.coinSymbol };
      }
      if (t.type === 'buy') netHoldings[t.coinId].quantity += t.quantity;
      else if (t.type === 'sell') netHoldings[t.coinId].quantity -= t.quantity;
    });
    const currentHoldings: Holding[] = Object.entries(netHoldings)
      .filter(([_, data]) => data.quantity > 0.00000001) // Filter for tiny remaining quantities
      .map(([coinId, data]) => ({ coinId, coinName: data.name, coinSymbol: data.symbol, quantity: data.quantity }));
    setHoldings(currentHoldings);
  }, [transactions, isLoadingTransactions, transactionsError]);

  useEffect(() => {
    if (transactionsError) { // Stop if transactions failed to load
      setIsLoadingPrices(false);
      setPricesError("Price fetching skipped due to transaction error.");
      return;
    }
    if (holdings.length === 0 && !isLoadingTransactions) {
      setMarketPrices({});
      setIsLoadingPrices(false);
      setPricesError(null);
      setTotalValue(0);
      setIsLoadingValue(false);
      return;
    }
    if (holdings.length === 0) return;

    const fetchPrices = async () => {
      setIsLoadingPrices(true);
      setPricesError(null);
      const coinIds = holdings.map(h => h.coinId).join(',');
      try {
        const response = await brain.get_market_data({ coin_ids: coinIds, vs_currency: currency });
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const pricesData = await response.json() as MarketData[];
        const pricesMap: Record<string, MarketData> = {};
        pricesData.forEach(price => { pricesMap[price.id] = price; });
        setMarketPrices(pricesMap);
      } catch (err: any) {
        console.error("Error fetching market prices: ", err);
        setPricesError(`Failed to load market prices: ${err.message}`);
      }
      setIsLoadingPrices(false);
    };
    fetchPrices();
  }, [holdings, currency, isLoadingTransactions, transactionsError]);

  useEffect(() => {
    setValueError(null);
    if (transactionsError) {
      setValueError("Cannot calculate value: transaction data unavailable.");
      setIsLoadingValue(false); 
      setTotalValue(null);
      return;
    }
    if (isLoadingTransactions || isLoadingPrices) {
      setIsLoadingValue(true); // Explicitly set loading if dependencies are loading
      return;
    }
    if (pricesError) {
      setValueError("Cannot calculate value: market price data unavailable.");
      setIsLoadingValue(false);
      setTotalValue(null);
      return;
    }
    if (holdings.length === 0) {
        setTotalValue(0);
        setIsLoadingValue(false);
        return;
    }
    
    let currentTotalValue = 0;
    let allPricesAvailable = true;
    for (const holding of holdings) {
      const priceData = marketPrices[holding.coinId];
      if (priceData?.current_price) {
        currentTotalValue += holding.quantity * priceData.current_price;
      } else {
        allPricesAvailable = false;
        break;
      }
    }

    if (!allPricesAvailable) {
        setValueError("Cannot calculate value: missing some market prices. Check if all coins are supported.");
        setTotalValue(null);
    } else {
        setTotalValue(currentTotalValue);
    }
    setIsLoadingValue(false);
  }, [holdings, marketPrices, isLoadingTransactions, transactionsError, isLoadingPrices, pricesError, currency]);

  useEffect(() => {
    setPnLError(null);
    if (transactionsError) {
      setPnLError("Cannot calculate P&L: transaction data unavailable.");
      setIsLoadingPnL(false);
      setTotalRealizedPnL(null);
      return;
    }
    if (isLoadingTransactions) {
      setIsLoadingPnL(true); // Explicitly set loading
      return;
    }
    if (transactions.length === 0) {
      setTotalRealizedPnL(0);
      setIsLoadingPnL(false);
      return;
    }

    try {
      const transactionsByCoin: Record<string, Transaction[]> = {};
      transactions.forEach(t => {
        if (!transactionsByCoin[t.coinId]) {
          transactionsByCoin[t.coinId] = [];
        }
        transactionsByCoin[t.coinId].push(t);
      });

      let overallPnL = 0;
      for (const coinId in transactionsByCoin) {
        const result = calculateFifoPnl(transactionsByCoin[coinId], currency);
        overallPnL += result.realizedPnL;
      }
      setTotalRealizedPnL(overallPnL);
    } catch (error: any) {
        console.error("Error calculating P&L:", error);
        setPnLError(`P&L calculation error: ${error.message || "Unknown error"}`);
        setTotalRealizedPnL(null);
    }
    setIsLoadingPnL(false);
  }, [transactions, currency, isLoadingTransactions, transactionsError]);

  const allocationData = useMemo(() => {
    if (isLoadingValue || valueError || totalValue === null || totalValue === 0 || holdings.length === 0) return [];
    return holdings
      .map(h => {
        const priceData = marketPrices[h.coinId];
        const value = priceData?.current_price ? h.quantity * priceData.current_price : 0;
        return {
          name: h.coinName,
          value: parseFloat(value.toFixed(2)),
          symbol: h.coinSymbol,
        };
      })
      .filter(d => d.value > 0.005) // Filter out very small values for cleaner chart
      .sort((a, b) => b.value - a.value);
  }, [holdings, marketPrices, isLoadingValue, valueError, totalValue]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalValue && totalValue > 0 ? (data.value / totalValue * 100).toFixed(2) : 0;
      return (
        <div className="p-3 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl text-sm">
          <p className="font-bold mb-1">{`${data.name} (${data.symbol})`}</p>
          <p>{`Value: ${formatCurrency(data.value)} (${percentage}%)`}</p>
        </div>
      );
    }
    return null;
  };
  
  const formatCurrency = (value: number | null, fractionDigits = 2) => {
    if (value === null || value === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  };

  const renderErrorAlert = (title: string, message: string | null) => (
    <Alert variant="destructive" className="mt-2 text-left">
        <Terminal className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        {message && <AlertDescription>{message}</AlertDescription>}
    </Alert>
  );

  const cardClassName = "bg-background/70 backdrop-blur-sm border-border/40 shadow-lg rounded-xl overflow-hidden";
  // Subtler shadow for inner elements if needed: shadow-md

  if (isLoadingTransactions && transactions.length === 0) {
    // Initial loading skeleton for the whole page if no transactions are loaded yet
    return (
        <div className="space-y-6 p-4 md:p-6">
            <Skeleton className={`h-36 w-full ${cardClassName}`} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className={`h-32 w-full ${cardClassName}`} />
                <Skeleton className={`h-80 w-full md:col-span-2 ${cardClassName}`} />
            </div>
            <Skeleton className={`h-80 w-full ${cardClassName}`} />
        </div>
    );
  }

  if (transactionsError && transactions.length === 0){
    return (
      <div className="p-4 md:p-6">
        {renderErrorAlert("Critical Error", transactionsError)}
        <p className="mt-4 text-center text-muted-foreground">Could not load essential portfolio data. Please try again later or contact support.</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6 p-1 md:p-2 lg:p-4">
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle className="text-2xl lg:text-3xl font-bold text-foreground">
            Portfolio Snapshot
          </CardTitle>
          <CardDescription className="text-base">
            Your current crypto asset valuation in {currency.toUpperCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-6">
          <div className="p-4 bg-background/50 rounded-lg">
            <h3 className="text-base font-medium text-muted-foreground mb-1">
              Total Portfolio Value ({currency.toUpperCase()})
            </h3>
            {isLoadingValue && !valueError ? (
              <Skeleton className="h-12 w-3/4" />
            ) : valueError ? (
              renderErrorAlert("Value Error", valueError)
            ) : totalValue !== null ? (
              <p className="text-4xl lg:text-5xl font-bold text-primary">
                {formatCurrency(totalValue)}
              </p>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">N/A</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`${cardClassName} flex flex-col`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-medium">Realized P&L</CardTitle>
                  <DollarSign className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-center items-center text-center min-h-[120px]">
                  {isLoadingPnL && !pnlError ? (
                      <Skeleton className="h-10 w-4/5" />
                  ) : pnlError ? (
                      renderErrorAlert("P&L Error", pnlError)
                  ) : totalRealizedPnL !== null ? (
                      <div className={`text-3xl lg:text-4xl font-bold ${totalRealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {totalRealizedPnL >= 0 ? <TrendingUp className="inline h-8 w-8 mr-1 mb-1" /> : <TrendingDown className="inline h-8 w-8 mr-1 mb-1" />}
                          {formatCurrency(totalRealizedPnL)}
                      </div>
                  ) : (
                      <p className="text-xl text-muted-foreground">N/A</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">Total profit/loss from sells.</p>
              </CardContent>
          </Card>

          <Card className={`${cardClassName} md:col-span-2 flex flex-col`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-medium">Portfolio Allocation</CardTitle>
                <PieChartIcon className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-grow min-h-[320px] md:min-h-[300px] flex items-center justify-center p-2 pt-2">
                {isLoadingValue && !valueError && holdings.length > 0 ? (
                  <Skeleton className="h-full w-full rounded-lg" />
                ) : valueError || pricesError ? (
                   <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                      {renderErrorAlert("Allocation Error", valueError || pricesError)}
                   </div>
                ) : allocationData.length > 0 && totalValue !== null && totalValue > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%" // Relative outer radius
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={NORDIC_COLORS[index % NORDIC_COLORS.length]} stroke={undefined} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                      <Legend 
                          layout="horizontal" 
                          verticalAlign="bottom" 
                          align=
                          "center" 
                          iconSize={12}
                          wrapperStyle={{ fontSize: '13px', paddingTop: '10px', paddingBottom: '5px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <Info className="h-10 w-10 text-muted-foreground/60 mb-3" />
                      <p className="text-muted-foreground font-semibold">No Allocation Data</p>
                      <p className="text-sm text-muted-foreground/80">Your portfolio is currently empty or has no assets with a positive value.</p>
                  </div>
                )}
              </CardContent>
            </Card>
      </div>

      <Card className={`${cardClassName} flex flex-col`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-medium">Historical Performance</CardTitle>
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-grow min-h-[320px] md:min-h-[300px] flex flex-col items-center justify-center text-center p-6">
              {isLoadingValue && !valueError ? (
              <Skeleton className="h-full w-full rounded-lg" />
              ) : valueError ? (
                 renderErrorAlert("Performance Chart Error", valueError)
              ) : (
              <>
                  <Terminal className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg text-muted-foreground font-semibold">Portfolio Value Over Time</p>
                  <p className="text-muted-foreground/80 text-sm mt-1 max-w-md">
                      A detailed chart showcasing your portfolio's historical value will be available here soon.
                  </p>
                  <p className="text-muted-foreground/80 text-sm mt-2 px-4 max-w-md">
                      This feature requires gathering historical price data for all your assets and may take some time to implement fully.
                  </p>
                  <p className="text-accent-foreground/90 text-base font-semibold mt-4 py-2 px-4 bg-accent/20 rounded-md">Feature Coming Soon!</p>
              </>
              )}
          </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioSummaryDashboard;
