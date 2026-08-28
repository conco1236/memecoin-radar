import React, { useState } from "react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    
    const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";
    
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setMessage(data.error || "Có lỗi xảy ra");
      } else {
        if (!isSignUp) {
          setCurrentUser(data.email);
          setShowAuthModal(false);
          window.location.reload(); // Reload nhẹ để đồng bộ dữ liệu phiên
        } else {
          setMessage("Đăng ký thành công! Hãy chuyển sang Đăng nhập.");
          setIsSignUp(false);
        }
      }
    } catch {
      setMessage("Không thể kết nối đến máy chủ.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] text-slate-950 font-sans antialiased">
      {/* HEADER SECTION MATCH GIAO DIỆN RADAR */}
      <header className="border-b border-slate-900/10 bg-white/85 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-11 border-2 border-slate-950 grid place-items-center bg-cyan-100">
              <span className="font-mono font-bold">MR</span>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-slate-500">THIẾT BỊ NGHIÊN CỨU / 01</p>
              <h1 className="text-xl font-black tracking-tight">MEMECOIN RADAR</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {currentUser ? (
              <span className="bg-slate-100 text-slate-700 px-4 py-2 border border-slate-300 font-mono text-[10px]">
                {currentUser.toUpperCase()}
              </span>
            ) : (
              <button 
                className="border border-pink-300 bg-pink-50 px-3 py-2 font-mono text-[10px] text-pink-800 hover:bg-pink-100 transition"
                onClick={() => { setShowAuthModal(true); setMessage(""); }}
              >
                ĐĂNG KÝ / ĐĂNG NHẬP
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-[1440px] mx-auto px-5 lg:px-10 py-8 relative">{children}</main>

      {/* POPUP MODAL ĐĂNG KÝ / ĐĂNG NHẬP EMAIL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-slate-950 max-w-sm w-full p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
            <button 
              className="absolute top-4 right-4 text-slate-400 hover:text-black font-bold text-sm"
              onClick={() => setShowAuthModal(false)}
            >
              ✕
            </button>
            <h2 className="text-base font-black mb-4 tracking-tight uppercase font-mono">
              {isSignUp ? "TẠO TÀI KHOẢN MỚI" : "ĐĂNG NHẬP HỆ THỐNG"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono tracking-wider font-bold text-slate-500 mb-1">ĐỊA CHỈ EMAIL</label>
                <input 
                  type="email" 
                  required
                  className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:border-slate-950"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono tracking-wider font-bold text-slate-500 mb-1">MẬT KHẨU</label>
                <input 
                  type="password" 
                  required
                  className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:border-slate-950"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {message && (
                <div className={`text-xs p-2.5 font-mono font-medium border ${message.includes("thành công") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                  {message}
                </div>
              )}

              <button type="submit" className="w-full bg-slate-950 text-white py-2 text-xs font-mono tracking-widest uppercase hover:bg-slate-800 transition">
                {isSignUp ? "ĐĂNG KÝ" : "ĐĂNG NHẬP"}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs font-mono text-slate-500">
              {isSignUp ? "ĐÃ CÓ TÀI KHOẢN?" : "CHƯA CÓ TÀI KHOẢN?"}{" "}
              <button 
                className="text-pink-600 font-bold hover:underline ml-1"
                onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }}
              >
                {isSignUp ? "ĐĂNG NHẬP" : "TẠO NGAY"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
