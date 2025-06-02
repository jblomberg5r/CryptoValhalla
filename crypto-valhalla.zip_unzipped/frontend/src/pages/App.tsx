import React from "react";
import { Sidebar } from "../components/Sidebar";
import MarketOverview from "../components/MarketOverview"; // Added import

// ... (Keep existing HeroSection, FeaturesOverviewSection, TrackingShowcaseSection, Footer, FeatureCard components as they are)

// Placeholder for a potential future icon library or individual SVG imports
// For now, using simple emoji or basic SVG for icons to keep it light.

const FeatureCard = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <div className="bg-card p-6 rounded-lg shadow-lg border border-border/10 hover:shadow-primary/10 transition-shadow duration-300 flex flex-col items-center text-center">
    <div className="text-5xl mb-5 text-blue-400">{icon}</div>
    <h3 className="text-xl font-semibold mb-3 text-foreground">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
  </div>
);

const HeroSection = () => (
  <header className="py-20 md:py-28 bg-gradient-to-br from-background to-secondary/30">
    <div className="container mx-auto px-6 text-center">
      <div className="mb-10">
        <div className="w-36 h-36 bg-blue-500/20 border-2 border-blue-400 mx-auto rounded-full flex items-center justify-center text-5xl font-bold text-blue-300 shadow-xl">
          CV
        </div>
      </div>
      <h1 className="text-5xl md:text-7xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-blue-400 to-blue-500">
        CryptoValhalla
      </h1>
      <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
        Navigate the Crypto Seas with Viking Precision. Your All-Seeing Eye on the Digital Hoard.
      </p>
    </div>
  </header>
);

const FeaturesOverviewSection = () => (
  <section id="features" className="py-16 md:py-24">
    <div className="container mx-auto px-6">
      <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-foreground">
        Forge Your Financial Destiny
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[{
          title: "Real-Time Rune Readings",
          description: "Live market data from CoinGecko. Prices, caps, 24h shifts – the runes speak clearly.",
          icon: "⚡️"
        }, {
          title: "Hoard Management",
          description: "Log your spoils & trades. FIFO accounting for true profit wisdom. Your digital strongbox.",
          icon: "🛡️"
        }, {
          title: "Clan Comparison Tools",
          description: "Pit digital currencies against each other. Normalized charts reveal the true champions.",
          icon: "⚖️"
        }, {
          title: "Seer's Analytics",
          description: "Gaze into the depths of each asset. Charts, omens, and market whispers unveiled.",
          icon: "📈"
        }, {
          title: "Tribute Tallies (Tax Reports)",
          description: "Summon comprehensive capital gains scrolls. Appease the tax gods with ease.",
          icon: "📄"
        }, {
          title: "Valhalla's Vault (Database)",
          description: "Your transaction sagas, etched securely. Focus on conquest, not quill-pushing.",
          icon: "🔒"
        }].map((feature) => <FeatureCard key={feature.title} {...feature} />)}
      </div>
    </div>
  </section>
);

const TrackingShowcaseSection = () => (
  <section id="tracking-showcase" className="py-16 md:py-24 bg-secondary/20">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-4xl md:text-5xl font-bold mb-16 text-foreground">
        Behold the Bifröst of Bitcoin
      </h2>
      <div className="bg-card p-6 sm:p-8 rounded-xl shadow-2xl border border-border/10 aspect-video max-w-4xl mx-auto flex items-center justify-center overflow-hidden">
        <img src="https://images.pexels.com/photos/6770610/pexels-photo-6770610.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" alt="Crypto Market Chart Showcase" className="w-full h-full object-cover rounded-lg shadow-md" />
        {/* Text overlay removed as per MYA-16 */}
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-10 mt-12 border-t border-border/10">
    <div className="container mx-auto px-6 text-center text-muted-foreground/80">
      <p className="mb-2 text-sm">
         &copy; {new Date().getFullYear()} CryptoValhalla. Skål! Forged in the digital fires.
      </p>
      <p className="text-xs">
        All data provided for informational purposes only. Consult a financial advisor before making investment decisions.
      </p>
    </div>
  </footer>
);

export default function App() {
  return (
    <> {/* Use a React Fragment */}
      <HeroSection />
      {/* The main structural elements (Sidebar, <main> tag with padding and container logic) 
          are now handled by AppProvider.tsx. 
          The content here will be injected into AppProvider's <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8"> */}
      <FeaturesOverviewSection />
      <MarketOverview />
      <TrackingShowcaseSection />
      <Footer />
    </>
  );
}
