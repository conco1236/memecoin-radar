import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, ArrowLeft, Save, Clock3 } from "lucide-react";

type FixedTime = "09:00" | "13:00" | "18:00" | "21:00";
type Timezone = "UTC" | "Asia/Ho_Chi_Minh" | "America/New_York" | "Europe/London";
const TIMES: FixedTime[] = ["09:00", "13:00", "18:00", "21:00"];
const TIMEZONES: Timezone[] = ["UTC", "Asia/Ho_Chi_Minh", "America/New_York", "Europe/London"];

export default function Settings() {
  const { isAuthenticated } = useAuth();
  const preferences = trpc.research.alertPreferences.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const save = trpc.research.saveAlertSchedule.useMutation({ onSuccess: () => preferences.refetch() });
  const disable = trpc.research.disableAlertSchedule.useMutation({ onSuccess: () => preferences.refetch() });
  const [potentialThreshold, setPotentialThreshold] = useState(70);
  const [highRiskThreshold, setHighRiskThreshold] = useState(75);
  const [enabled, setEnabled] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [timesUtc, setTimesUtc] = useState<FixedTime[]>(["09:00"]);
  const [timezone, setTimezone] = useState<Timezone>("UTC");

  useEffect(() => {
    if (!preferences.data) return;
    setPotentialThreshold(preferences.data.potentialThreshold);
    setHighRiskThreshold(preferences.data.highRiskThreshold);
    setEnabled(Boolean(preferences.data.enabled));
    setScheduleEnabled(Boolean(preferences.data.scheduleEnabled));
    setTimezone((preferences.data.timezone as Timezone) || "UTC");
    const saved = preferences.data.scheduleCron?.match(/\d{1,2}/g)?.map(hour => `${hour.padStart(2, "0")}:00` as FixedTime).filter(time => TIMES.includes(time));
    if (saved?.length) setTimesUtc(Array.from(new Set(saved)));
  }, [preferences.data]);

  const toggleTime = (time: FixedTime) => setTimesUtc(current => current.includes(time) ? current.filter(item => item !== time) : [...current, time].sort());
  const submit = () => save.mutate({ potentialThreshold, highRiskThreshold, enabled: enabled ? 1 : 0, scheduleEnabled, timezone, timesUtc: timesUtc.length ? timesUtc : ["09:00"] });

  if (!isAuthenticated) return <main className="min-h-screen bg-[#f8fafb] grid place-items-center p-6"><Card className="max-w-lg rounded-none border-slate-300"><CardContent className="p-8"><p className="font-mono text-xs text-pink-600">TELEGRAM / SETTINGS</p><h1 className="text-3xl font-black mt-3">Đăng nhập để cấu hình cảnh báo.</h1><p className="font-mono text-sm text-slate-500 leading-6 mt-4">Ngưỡng và lịch cảnh báo được lưu riêng theo tài khoản. Không có hành động giao dịch.</p><Button className="mt-6 rounded-none" onClick={() => startLogin()}>ĐĂNG NHẬP</Button></CardContent></Card></main>;

  return <main className="min-h-screen bg-[#f8fafb] text-slate-950 p-6 lg:p-12"><div className="max-w-3xl mx-auto"><Link href="/"><span className="inline-flex items-center gap-2 font-mono text-xs text-slate-500 hover:text-slate-950"><ArrowLeft className="size-4"/> QUAY LẠI RADAR</span></Link><div className="mt-8 mb-8"><p className="font-mono text-xs text-pink-600">// CẤU HÌNH CẢNH BÁO</p><h1 className="text-5xl font-black tracking-tight mt-2">Telegram control room.</h1><p className="font-mono text-sm text-slate-500 mt-4 max-w-2xl">Chọn điều kiện sàng lọc và các khung giờ cố định để gửi bản tin memecoin đạt ngưỡng. Hệ thống tự chuyển giờ địa phương sang cron UTC.</p></div><div className="grid gap-5"><Card className="rounded-none border-slate-300"><CardHeader><CardTitle className="font-mono text-sm">NGƯỠNG TÍN HIỆU</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-5"><label className="font-mono text-xs">Điểm tiềm năng tối thiểu<input type="number" min="0" max="100" value={potentialThreshold} onChange={e => setPotentialThreshold(Number(e.target.value))} className="mt-2 w-full border border-slate-300 bg-white p-3 text-lg"/><span className="block text-[10px] text-slate-400 mt-2">Gửi khi potential score ≥ giá trị này.</span></label><label className="font-mono text-xs">Điểm rủi ro cao<input type="number" min="0" max="100" value={highRiskThreshold} onChange={e => setHighRiskThreshold(Number(e.target.value))} className="mt-2 w-full border border-slate-300 bg-white p-3 text-lg"/><span className="block text-[10px] text-slate-400 mt-2">Cảnh báo token đang theo dõi khi risk score ≥ giá trị này.</span></label><label className="md:col-span-2 flex items-center gap-3 border-t border-slate-200 pt-4 font-mono text-xs"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}/> Cho phép đánh giá và gửi cảnh báo Telegram</label></CardContent></Card><Card className="rounded-none border-slate-300"><CardHeader><CardTitle className="font-mono text-sm flex items-center gap-2"><Clock3 className="size-4"/> LỊCH GỬI CỐ ĐỊNH</CardTitle></CardHeader><CardContent><div className="flex items-start gap-2 mb-4"><Tooltip><TooltipTrigger asChild><Info className="size-4 text-cyan-600 mt-0.5"/></TooltipTrigger><TooltipContent className="max-w-sm font-mono text-xs">Heartbeat chạy theo UTC. Chọn một hoặc nhiều khung giờ; hệ thống tạo một lịch cron duy nhất trong ngày và gửi tối đa một bản tin cho cùng một fingerprint dữ liệu.</TooltipContent></Tooltip><p className="font-mono text-xs text-slate-500">Chọn giờ địa phương; hệ thống tự chuyển sang cron UTC.</p><select value={timezone} onChange={e => setTimezone(e.target.value as Timezone)} className="mt-3 border border-slate-300 bg-white p-2 font-mono text-xs">{TIMEZONES.map(zone => <option key={zone} value={zone}>{zone}</option>)}</select></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{TIMES.map(time => <button key={time} type="button" onClick={() => toggleTime(time)} className={`border p-4 font-mono text-sm ${timesUtc.includes(time) ? "border-cyan-500 bg-cyan-50" : "border-slate-300 bg-white"}`}>{time}</button>)}</div><label className="flex items-center gap-3 mt-5 font-mono text-xs"><input type="checkbox" checked={scheduleEnabled} onChange={e => setScheduleEnabled(e.target.checked)}/> Bật lịch tự động</label><p className="font-mono text-[10px] text-slate-400 mt-3">Lịch chỉ bắt đầu sau khi phiên bản đã được deploy production. Tắt lịch sẽ pause Heartbeat hiện tại.</p>{preferences.data?.lastDeliveredAt && <div className="mt-5 border-t border-slate-200 pt-4 font-mono text-[10px] text-slate-500">GIAO HÀNG GẦN NHẤT: {new Date(preferences.data.lastDeliveredAt).toLocaleString()}<br/>FINGERPRINT: {preferences.data.lastDeliveredFingerprint ?? "—"}</div>}</CardContent></Card><div className="flex flex-wrap gap-3"><Button onClick={submit} disabled={save.isPending} className="rounded-none"><Save className="size-4 mr-2"/>{save.isPending ? "ĐANG LƯU" : "LƯU CẤU HÌNH"}</Button>{scheduleEnabled && <Button variant="outline" onClick={() => disable.mutate()} disabled={disable.isPending} className="rounded-none">TẮT LỊCH</Button>}{(save.data || disable.data) && <span className="font-mono text-xs text-emerald-700 self-center">Đã lưu. Cron UTC: {save.data?.cron ?? "đã tắt"}</span>}</div></div></div></main>;
}
