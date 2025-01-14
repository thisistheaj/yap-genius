import { useNavigate } from "@remix-run/react";
import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { useState } from "react";

export function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Navigate to Yappy's DM with the search query
    navigate(`/app/dm/yappy?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className="px-3 py-2">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>
    </form>
  );
} 