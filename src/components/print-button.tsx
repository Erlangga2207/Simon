"use client";

import { Printer } from "lucide-react";
import { Button } from "./ui";

/** Cetak halaman laporan — pengguna bisa memilih "Save as PDF" di dialog cetak browser. */
export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <Printer className="h-3.5 w-3.5" /> Cetak / PDF
    </Button>
  );
}
