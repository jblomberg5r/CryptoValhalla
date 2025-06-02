import React from "react";
import { NavLink, Link } from "react-router-dom"; // Removed useLocation as it's not used
import { useCurrentCurrency, Currency } from "../utils/currencyStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Button import was present but not used, removed for cleanliness unless needed later
import { 
  Home, 
  LineChart, 
  BarChart2, 
  Settings, 
  Shield,
  DollarSign, 
  Wallet, 
  FileText,
  User as UserIcon, // Aliased User to UserIcon
  LogIn,            // Added LogIn icon
  LogOut,           // Added LogOut icon
  UserPlus          // Added UserPlus icon
} from 'lucide-react';
import { useCurrentUser } from "app";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  subItems?: NavItem[];
  protected?: boolean;
}

export const mainNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/MyCryptoPage", label: "My Crypto", icon: Wallet, protected: true }, 
  { href: "/ComparePage", label: "Compare", icon: BarChart2 },
  { href: "/AnalyticsPage", label: "Analytics", icon: LineChart, protected: true },
  { href: "/TaxReportsPage", label: "Tax Reports", icon: FileText, protected: true },
  { href: "/AdminPage", label: "Admin", icon: Shield, protected: true },
  // ProfilePage is now handled conditionally in the Auth Navigation Section
];

export const secondaryNavItems: NavItem[] = [
  { href: "/SettingsPage", label: "Settings", icon: Settings },
];

export const Sidebar = () => {
  const { currency, setCurrency } = useCurrentCurrency();
  const { user, loading } = useCurrentUser();

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-sm text-sm font-medium transition-colors duration-150 
    ${
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-primary/10 hover:text-primary-foreground"
    }`;

  return (
    <div className="w-64 min-h-screen bg-card text-card-foreground p-4 flex flex-col border-r border-border/20 shadow-lg z-20">
      {/* Logo Placeholder */}
      <div className="mb-10 pt-4 pb-2 text-center">
        <Link to="/" className="block">
          <div className="w-20 h-20 bg-blue-500/20 border-2 border-blue-400 mx-auto rounded-full flex items-center justify-center text-3xl font-bold text-blue-300 shadow-md hover:bg-blue-500/30 transition-colors">
            CV
          </div>
          <h1 className="text-2xl font-bold mt-4 text-primary-foreground hover:text-primary transition-colors">CryptoValhalla</h1>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-grow">
        <ul>
          {mainNavItems.map((item) => (
            <li key={item.label} className="mb-2">
              <NavLink
                to={item.href}
                className={navLinkClasses}
              >
                <item.icon size={20} className="mr-3 opacity-80" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Auth Navigation Section */}
      <nav className="mt-4 pt-4 border-t border-border/20">
        <ul>
          {loading ? (
            <li className="px-4 py-3 text-sm text-muted-foreground flex items-center">
                <Wallet size={20} className="mr-3 opacity-80 animate-pulse" /> 
                <span>Loading user...</span>
            </li>
          ) : user ? (
            <>
              <li className="mb-2">
                <NavLink to="/ProfilePage" className={navLinkClasses}>
                  <UserIcon size={20} className="mr-3 opacity-80" />
                  <span>Profile</span>
                </NavLink>
              </li>
              <li className="mb-2">
                <NavLink to="/Logout" className={navLinkClasses}> {/* Assuming /Logout is a page that handles logout */}
                  <LogOut size={20} className="mr-3 opacity-80" />
                  <span>Logout</span>
                </NavLink>
              </li>
            </>
          ) : (
            <>
              <li className="mb-2">
                <NavLink to="/login" className={navLinkClasses}>
                  <LogIn size={20} className="mr-3 opacity-80" />
                  <span>Login</span>
                </NavLink>
              </li>
              <li className="mb-2">
                <NavLink to="/SignupPage" className={navLinkClasses}>
                  <UserPlus size={20} className="mr-3 opacity-80" />
                  <span>Sign Up</span>
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </nav>
      
      {/* Secondary Navigation (e.g., Settings) */}
      {/* This section could also be conditional based on login state or user roles */}
      {secondaryNavItems.length > 0 && (
        <nav className="mt-4 pt-4 border-t border-border/20">
            <ul>
            {secondaryNavItems.map((item) => (
                <li key={item.label} className="mb-2">
                <NavLink
                    to={item.href}
                    className={navLinkClasses}
                >
                    <item.icon size={20} className="mr-3 opacity-80" />
                    <span>{item.label}</span>
                </NavLink>
                </li>
            ))}
            </ul>
        </nav>
      )}

      {/* Currency Selector */}
      <div className="mt-auto mb-4 pt-6">
        <label htmlFor="currency-select" className="block text-xs font-medium text-muted-foreground mb-1.5 px-1">Display Currency</label>
        <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
          <SelectTrigger id="currency-select" className="w-full border-border/50 focus:ring-primary focus:border-primary">
            <div className="flex items-center">
                <DollarSign size={16} className="mr-2 opacity-70"/> 
                <SelectValue placeholder="Select currency" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border/50">
            {['USD', 'EUR', 'SEK'].map((curr) => (
              <SelectItem key={curr} value={curr} className="focus:bg-primary/20">
                {curr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Footer */}
      <div className="border-t border-border/20 pt-4 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Valhalla</p>
      </div>
    </div>
  );
};
