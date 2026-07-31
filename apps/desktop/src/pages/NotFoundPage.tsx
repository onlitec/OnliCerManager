import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-muted-foreground/20">404</p>
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground">A página que você procura não existe.</p>
      <Button asChild>
        <Link to="/">
          <Home className="mr-2 h-4 w-4" />
          Ir para o Dashboard
        </Link>
      </Button>
    </div>
  );
}
