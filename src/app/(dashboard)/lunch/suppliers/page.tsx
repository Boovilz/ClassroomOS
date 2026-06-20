import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getSuppliers, getPurchaseOrders, getSupplierPerformance } from "@/lib/queries/lunch";
import { SupplierFormDialog } from "./supplier-form-dialog";
import { PurchaseOrderFormDialog } from "./purchase-order-form-dialog";
import { PurchaseOrderStatusSelect } from "./purchase-order-status-select";

const statusLabel: Record<string, string> = {
  draft: "ร่าง",
  ordered: "สั่งซื้อแล้ว",
  delivered: "ได้รับแล้ว",
  invoiced: "ออกใบแจ้งหนี้แล้ว",
  paid: "ชำระเงินแล้ว",
  cancelled: "ยกเลิก",
};

export default async function LunchSuppliersPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };
  const schoolId = profile?.school_id ?? null;

  const [suppliers, purchaseOrders, performance] = schoolId
    ? await Promise.all([getSuppliers(schoolId), getPurchaseOrders(schoolId), getSupplierPerformance(schoolId)])
    : [[], [], []];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดซื้อ / ผู้จำหน่าย</h1>
          <p className="text-sm text-muted-foreground">จัดการรายชื่อผู้จำหน่ายและใบสั่งซื้อวัตถุดิบ</p>
        </div>
        <div className="flex gap-2">
          {schoolId && <SupplierFormDialog schoolId={schoolId} />}
          {schoolId && <PurchaseOrderFormDialog schoolId={schoolId} suppliers={suppliers} />}
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ผู้จำหน่าย</CardTitle>
          <CardDescription>รายชื่อผู้จำหน่ายวัตถุดิบและผลการดำเนินงาน (คำนวณจากใบสั่งซื้อ)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>ผู้ติดต่อ</TableHead>
                <TableHead>โทรศัพท์</TableHead>
                <TableHead>จำนวนคำสั่งซื้อ</TableHead>
                <TableHead>ยอดรวม (บาท)</TableHead>
                <TableHead>ส่งตรงเวลา</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีผู้จำหน่าย
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((s) => {
                  const perf = performance.find((p) => p.supplierId === s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.contact_name ?? "-"}</TableCell>
                      <TableCell>{s.phone ?? "-"}</TableCell>
                      <TableCell>{perf?.totalOrders ?? 0}</TableCell>
                      <TableCell>{(perf?.totalSpend ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{perf?.onTimeRate != null ? `${perf.onTimeRate}%` : "-"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>ใบสั่งซื้อ</CardTitle>
          <CardDescription>ประวัติคำสั่งซื้อวัตถุดิบทั้งหมด</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขที่ใบสั่งซื้อ</TableHead>
                <TableHead>ผู้จำหน่าย</TableHead>
                <TableHead>รายการ</TableHead>
                <TableHead>ยอดรวม</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>กำหนดส่ง</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีใบสั่งซื้อ
                  </TableCell>
                </TableRow>
              ) : (
                purchaseOrders.map((po) => {
                  const supplier = Array.isArray(po.food_suppliers) ? po.food_suppliers[0] : po.food_suppliers;
                  return (
                    <TableRow key={po.id}>
                      <TableCell>{po.order_no}</TableCell>
                      <TableCell>{supplier?.name ?? "-"}</TableCell>
                      <TableCell>{po.item_summary ?? "-"}</TableCell>
                      <TableCell>{po.total_amount?.toLocaleString() ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={po.status === "cancelled" ? "destructive" : po.status === "paid" ? "success" : "secondary"}>
                          {statusLabel[po.status] ?? po.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString("th-TH") : "-"}</TableCell>
                      <TableCell>
                        <PurchaseOrderStatusSelect orderId={po.id} currentStatus={po.status} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
