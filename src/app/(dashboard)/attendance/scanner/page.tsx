import { QrScanner } from "@/components/attendance/qr-scanner";

export default function AttendanceScannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">เครื่องสแกน QR เช็คชื่อ</h1>
        <p className="text-sm text-muted-foreground">เปิดกล้องเพื่อสแกน QR ของนักเรียน รองรับการทำงานออฟไลน์และซิงค์อัตโนมัติ</p>
      </div>
      <QrScanner mode="classroom" />
    </div>
  );
}
