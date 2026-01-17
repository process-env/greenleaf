import { Header } from "@/components/header";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} GreenLeaf Dispensary. All rights
            reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            For demonstration purposes only. Must be 21+ to purchase.
          </p>
        </div>
      </footer>
    </div>
  );
}
