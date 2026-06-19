import { KioskCheckIn } from "./kiosk-check-in";

export default function AttendanceKioskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">โหมดคีออส</h1>
        <p className="text-sm text-muted-foreground">สำหรับติดตั้งที่หน้าห้องเรียนให้นักเรียนเช็คชื่อด้วยตนเอง</p>
      </div>
      <KioskCheckIn />
    </div>
  );
}
