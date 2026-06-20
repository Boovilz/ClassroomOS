import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getInventoryList, getStockAlerts, getSuppliers } from "@/lib/queries/lunch";
import { InventoryFormDialog } from "./inventory-form-dialog";
import { StockAdjustDialog } from "./stock-adjust-dialog";

const alertLabel: Record<string, string> = {
  low_stock: "ใกล้หมด",
  out_of_stock: "หมดสต็อก",
  near_expiry: "ใกล้หมดอายุ",
  expired: "หมดอายุแล้ว",
};

export default async function LunchInventoryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth?.user
    ? await supabase.from("users").select("school_id").eq("id", auth.user.id).single()
    : { data: null };

  const schoolId = profile?.school_id ?? null;

  const [inventory, alerts, suppliers] = schoolId
    ? await Promise.all([getInventoryList(schoolId), getStockAlerts(schoolId), getSuppliers(schoolId)])
    : [[], [], []];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">คลังวัตถุดิบ</h1>
          <p className="text-sm text-muted-foreground">จัดการวัตถุดิบ วัสดุครัว และการตรวจสอบสต็อก</p>
        </div>
        {schoolId && <InventoryFormDialog schoolId={schoolId} suppliers={suppliers} />}
      </div>

      {alerts.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">การแจ้งเตือนสต็อก</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <Badge key={i} variant={a.alertType === "expired" || a.alertType === "out_of_stock" ? "destructive" : "secondary"}>
                {a.itemName}: {alertLabel[a.alertType]}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>รายการวัตถุดิบ</CardTitle>
          <CardDescription>วัตถุดิบ/วัสดุครัวคงเหลือทั้งหมด</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รายการ</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead>คงเหลือ</TableHead>
                <TableHead>วันหมดอายุ</TableHead>
                <TableHead>ผู้จำหน่าย</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    ยังไม่มีรายการวัตถุดิบ
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => {
                  const supplier = Array.isArray(item.food_suppliers) ? item.food_suppliers[0] : item.food_suppliers;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell>{item.expiration_date ? new Date(item.expiration_date).toLocaleDateString("th-TH") : "-"}</TableCell>
                      <TableCell>{supplier?.name ?? "-"}</TableCell>
                      <TableCell>
                        <StockAdjustDialog schoolId={schoolId!} inventoryId={item.id} itemName={item.item_name} />
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
