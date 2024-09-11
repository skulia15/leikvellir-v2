export default function NavigationBar() {
  return (
    <nav>
      <div className="fixed left-0 right-0 top-0 z-10 bg-slate-200 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold">Leikvellir</h1>
          <button>Menu</button>
        </div>
      </div>
    </nav>
  );
}
