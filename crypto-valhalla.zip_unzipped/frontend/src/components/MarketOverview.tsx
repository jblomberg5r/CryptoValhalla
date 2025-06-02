import React, { useEffect, useState, useMemo } from "react";
import brain from "brain";
import { MarketData } from "../brain/data-contracts"; 
import { useCurrentCurrency } from "../utils/currencyStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { Terminal, ArrowUp, ArrowDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react"; 

type SortKey = keyof Pick<MarketData, "name" | "current_price" | "price_change_percentage_24h" | "market_cap" | "total_volume"> | "market_cap_rank";
type SortDirection = "asc" | "desc";

const PER_PAGE = 25;

// Helper function to highlight matches
const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim() || !text) return <>{text}</>;
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const parts = [];
  let lastIndex = 0;
  let matchIndex = lowerText.indexOf(lowerQuery, lastIndex);

  while (matchIndex !== -1) {
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }
    const matchedText = text.substring(matchIndex, matchIndex + query.length);
    parts.push(<strong key={`${text}-${matchIndex}-${matchedText}`} className="text-primary font-semibold bg-primary/10 px-0.5 rounded-sm">{matchedText}</strong>);
    lastIndex = matchIndex + query.length;
    matchIndex = lowerText.indexOf(lowerQuery, lastIndex);
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return <>{parts.length > 0 ? parts.map((part, i) => <React.Fragment key={i}>{part}</React.Fragment>) : text}</>;
};

const MarketOverview = () => {
  const { currency } = useCurrentCurrency();
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("market_cap_rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [filterQuery, setFilterQuery] = useState(""); 

  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await brain.get_market_data({
          vsCurrency: currency.toLowerCase(), 
          perPage: PER_PAGE, 
          page: currentPage 
        }); 
        if (response.ok) {
          const data = await response.json();
          setMarketData(data.data || []); 
          setHasNextPage((data.data || []).length === PER_PAGE);
        } else {
          const errorText = await response.text();
          console.error("Error fetching market data:", response.status, errorText);
          setError(`Failed to fetch market data: ${response.status} ${errorText || response.statusText}`);
          setHasNextPage(false);
        }
      } catch (err: any) {
        console.error("Network or other error fetching market data:", err);
        setError(err.message || "An unexpected error occurred.");
        setHasNextPage(false);
      }
      setIsLoading(false);
    };

    fetchMarketData();
  }, [currency, currentPage]);

  const processedMarketData = useMemo(() => {
    if (!marketData) return [];
    
    let dataToProcess = [...marketData];

    if (filterQuery.trim() !== "") {
      const lowercasedFilter = filterQuery.toLowerCase();
      dataToProcess = dataToProcess.filter(coin => 
        coin.name.toLowerCase().includes(lowercasedFilter) || 
        coin.symbol.toLowerCase().includes(lowercasedFilter)
      );
    }

    return dataToProcess.sort((a, b) => {
      let valA = a[sortKey as keyof MarketData];
      let valB = b[sortKey as keyof MarketData];

      if (sortKey === 'market_cap_rank') {
        valA = a.market_cap_rank ?? Infinity;
        valB = b.market_cap_rank ?? Infinity;
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      } else {
        valA = valA ?? (sortDirection === "asc" ? Infinity : -Infinity);
        valB = valB ?? (sortDirection === "asc" ? Infinity : -Infinity);
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [marketData, sortKey, sortDirection, filterQuery]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const formatCurrency = (value: number | null | undefined, localeCurrency: string) => {
    if (value == null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: localeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value == null) return "N/A";
    return `${value.toFixed(2)}%`;
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (error && !isLoading) {
    return (
      <Alert variant="destructive" className="my-8">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Fetching Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="bg-card p-4 sm:p-6 rounded-xl shadow-xl border border-border/20 my-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground whitespace-nowrap">Market Overview</h2>
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    type="text"
                    placeholder="Filter coins (e.g. BTC, Ether)"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="pl-10 bg-background/50 focus:bg-background transition-colors duration-200"
                />
            </div>
        </div>
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead 
                className="cursor-pointer hover:bg-muted/10 transition-colors py-3"
                onClick={() => handleSort("market_cap_rank")}
              >
                <div className="flex items-center text-muted-foreground/80">
                  # {renderSortIcon("market_cap_rank")}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/10 transition-colors py-3"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center text-muted-foreground/80">
                  Coin {renderSortIcon("name")}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/10 transition-colors py-3"
                onClick={() => handleSort("current_price")}
              >
                <div className="flex items-center justify-end text-muted-foreground/80">
                  Price {renderSortIcon("current_price")}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/10 transition-colors py-3"
                onClick={() => handleSort("price_change_percentage_24h")}
              >
                <div className="flex items-center justify-end text-muted-foreground/80">
                  24h % {renderSortIcon("price_change_percentage_24h")}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/10 transition-colors py-3"
                onClick={() => handleSort("market_cap")}
              >
                <div className="flex items-center justify-end text-muted-foreground/80">
                  Market Cap {renderSortIcon("market_cap")}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/10 transition-colors py-3"
                onClick={() => handleSort("total_volume")}
              >
                <div className="flex items-center justify-end text-muted-foreground/80">
                  Volume (24h) {renderSortIcon("total_volume")}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: PER_PAGE }).map((_, index) => (
                  <TableRow key={index} className="border-border/20">
                    <TableCell><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-20 mb-1" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-32 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                  </TableRow>
                ))
              : processedMarketData.map((coin) => (
                  <TableRow key={coin.id} className="border-border/20 hover:bg-muted/10 transition-colors">
                    <TableCell className="text-muted-foreground py-4">{coin.market_cap_rank || "N/A"}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center space-x-3">
                        <img src={coin.image} alt={coin.name} className="h-8 w-8 rounded-full" />
                        <div>
                          <div className="font-medium text-foreground">
                            <HighlightMatch text={coin.name} query={filterQuery} />
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">
                             <HighlightMatch text={coin.symbol} query={filterQuery} />
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground py-4">
                      {formatCurrency(coin.current_price, currency)}
                    </TableCell>
                    <TableCell 
                        className={`text-right font-medium py-4 ${ (coin.price_change_percentage_24h ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      <div className="flex items-center justify-end">
                        {(coin.price_change_percentage_24h ?? 0) >= 0 ? 
                          <ArrowUp size={14} className="mr-1 opacity-90" /> : 
                          <ArrowDown size={14} className="mr-1 opacity-90" />
                        }
                        {formatPercentage(coin.price_change_percentage_24h)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground py-4">
                      {formatCurrency(coin.market_cap, currency)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground py-4">
                      {formatCurrency(coin.total_volume, currency)}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {processedMarketData.length === 0 && !isLoading && (
            <div className="text-center py-10 text-muted-foreground">
                {filterQuery ? `No coins found matching "${filterQuery}".` : "No market data available for the current selection or failed to load."}
            </div>
        )}
      </div>
      <div className="flex items-center justify-between pt-6 border-t border-border/20 mt-6">
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePreviousPage} 
            disabled={currentPage === 1 || isLoading}
            className="border-primary/40 hover:bg-primary/10 hover:text-primary"
        >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
        </Button>
        <span className="text-sm text-muted-foreground">
            Page {currentPage}
        </span>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNextPage} 
            disabled={!hasNextPage || isLoading}
            className="border-primary/40 hover:bg-primary/10 hover:text-primary"
        >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default MarketOverview;
