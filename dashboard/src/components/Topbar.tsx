export default function Topbar() {
  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-gray-100 shrink-0">
      <span className="text-lg font-bold text-gray-900">Harvestlynk</span>
      <div className="flex items-center gap-3">
        <button className="relative text-gray-500 hover:text-gray-800">
          <i className="ri-notification-3-line text-xl" />
        </button>
        <button className="text-gray-500 hover:text-gray-800">
          <i className="ri-message-3-line text-xl" />
        </button>
        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-[#0D631B] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
            D
          </div>
          <span className="text-sm font-medium text-gray-700">Daniel</span>
        </div>
      </div>
    </header>
  );
}
