import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function useQrDataUrl(text: string): string {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!text) {
      setDataUrl("");
      return;
    }
    QRCode.toDataURL(text, { margin: 1, width: 320 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  return dataUrl;
}
