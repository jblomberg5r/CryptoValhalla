import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CalendarIcon, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { firebaseApp, useCurrentUser } from "app";
import { doc, updateDoc, Timestamp, getFirestore } from "firebase/firestore";
import { Transaction } from "utils/firestoreTypes";

const db = getFirestore(firebaseApp);

interface Coin {
  id: string;
  symbol: string;
  name: string;
}

// Same schema as AddTransactionForm
const transactionFormSchema = z.object({
  type: z.enum(["buy", "sell"], { required_error: "Transaction type is required." }),
  date: z.date({ required_error: "Transaction date is required." }),
  selectedCoin: z.object(
    {
      id: z.string({ required_error: "Coin ID is required." }),
      name: z.string({ required_error: "Coin name is required." }),
      symbol: z.string({ required_error: "Coin symbol is required." }),
    },
    { required_error: "Please select a cryptocurrency." } // More user-friendly message
  ),
  quantity: z.coerce.number().positive({ message: "Quantity must be a positive number." }),
  pricePerCoin: z.coerce.number().positive({ message: "Price per coin must be a positive number." }),
  currencyAtTransaction: z.string().default("USD"), // Assuming USD as default, can be dynamic later
  exchange: z.string().trim().optional(), // Added trim
  fees: z.coerce.number().nonnegative({ message: "Fees cannot be negative." }).optional(),
  notes: z.string().trim().optional(), // Added trim
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionWithId extends Transaction {
    id: string;
}

interface EditTransactionFormProps {
  transaction: TransactionWithId;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const EditTransactionForm: React.FC<EditTransactionFormProps> = ({ transaction, onSuccess, onCancel }) => {
  const { user } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCoins, setIsFetchingCoins] = useState(false);
  const [coinList, setCoinList] = useState<Coin[]>([]);
  const [coinSearchOpen, setCoinSearchOpen] = useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
        type: transaction.type,
        date: transaction.date.toDate(), // Convert Firestore Timestamp to JS Date
        selectedCoin: {
            id: transaction.coinId,
            name: transaction.coinName,
            symbol: transaction.coinSymbol,
        },
        quantity: transaction.quantity,
        pricePerCoin: transaction.pricePerCoin,
        currencyAtTransaction: transaction.currencyAtTransaction,
        exchange: transaction.exchange || "",
        fees: transaction.fees || undefined,
        notes: transaction.notes || "",
    },
  });

  useEffect(() => {
    const fetchCoins = async () => {
      setIsFetchingCoins(true);
      try {
        // Fetching all coins, ideally we might only need to validate the current one
        // or fetch if the user tries to change it.
        const response = await fetch("https://api.coingecko.com/api/v3/coins/list?include_platform=false");
        if (!response.ok) throw new Error("Failed to fetch coin list from CoinGecko");
        const data: Coin[] = await response.json();
        setCoinList(data.map(c => ({ id: c.id, name: c.name, symbol: c.symbol.toUpperCase() })));
      } catch (error) {
        console.error("Error fetching coin list:", error);
        toast.error("Could not load cryptocurrency list. Please try refreshing.");
      }
      setIsFetchingCoins(false);
    };
    fetchCoins();
  }, []);

  const onSubmit = async (data: TransactionFormValues) => {
    setIsLoading(true);
    if (!user) {
      toast.error("You must be logged in to update a transaction.");
      setIsLoading(false);
      return;
    }
    if (!data.selectedCoin) {
        toast.error("Please select a cryptocurrency.");
        setIsLoading(false);
        return;
    }

    const transactionDocRef = doc(db, `users/${user.uid}/transactions`, transaction.id);

    const updatedTransactionData: Partial<Transaction> = {
      type: data.type,
      coinId: data.selectedCoin.id,
      coinName: data.selectedCoin.name,
      coinSymbol: data.selectedCoin.symbol,
      date: Timestamp.fromDate(data.date),
      quantity: data.quantity,
      pricePerCoin: data.pricePerCoin,
      currencyAtTransaction: data.currencyAtTransaction,
      exchange: data.exchange,
      fees: data.fees,
      notes: data.notes,
      updatedAt: Timestamp.now(), // Update the updatedAt timestamp
    };

    try {
      await updateDoc(transactionDocRef, updatedTransactionData);
      toast.success("Transaction updated successfully!");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction. Please try again.");
    }
    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Type Field */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Transaction Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <RadioGroupItem value="buy" />
                    </FormControl>
                    <FormLabel className="font-normal">Buy</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <RadioGroupItem value="sell" />
                    </FormControl>
                    <FormLabel className="font-normal">Sell</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Field */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Cryptocurrency Field */}
        <FormField
          control={form.control}
          name="selectedCoin"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Cryptocurrency</FormLabel>
              <Popover open={coinSearchOpen} onOpenChange={setCoinSearchOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={coinSearchOpen}
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? `${field.value.name} (${field.value.symbol.toUpperCase()})`
                        : "Select coin..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                  <Command filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                    return 0;
                  }}>
                    <CommandInput placeholder={isFetchingCoins ? "Loading coins..." : "Search coin..."} disabled={isFetchingCoins} />
                    <CommandList>
                      {isFetchingCoins && (
                        <div className="p-2 flex items-center justify-center">
                           <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                       )}
                      <CommandEmpty>{!isFetchingCoins && coinList.length === 0 ? "No coins available." : "No coin found."}</CommandEmpty>
                      <CommandGroup>
                        {coinList.map((coin) => (
                          <CommandItem
                            key={coin.id}
                            value={`${coin.name} (${coin.symbol}) ${coin.id}`}
                            onSelect={() => {
                              form.setValue("selectedCoin", coin, { shouldValidate: true });
                              setCoinSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                field.value?.id === coin.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {coin.name} ({coin.symbol})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quantity & Price Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pricePerCoin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price Per Coin ({form.watch("currencyAtTransaction")})</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Exchange & Fees Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="exchange"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exchange (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Binance" {...field} value={field.value ?? ""}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fees (Optional, in {form.watch("currencyAtTransaction")})</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="0.00" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes Field */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Long term hold" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-3 pt-2">
            {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
            )}
            <Button type="submit" disabled={isLoading || isFetchingCoins} className="min-w-[120px]">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Transaction"}
            </Button>
        </div>
      </form>
    </Form>
  );
};
