import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import "./WindowControls.css";
import { useT } from "../i18n";

export function WindowControls() {
  const t = useT();
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    const unlisten = getCurrentWebviewWindow().onFocusChanged(({ payload }) => setFocused(payload));
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const win = getCurrentWebviewWindow();

  return (
    <div className={`wc${focused ? "" : " blurred"}`}>
      <button className="wc-btn minimize" aria-label={t("wc.minimize")} onClick={() => win.minimize().catch(() => {})} />
      <button className="wc-btn close" aria-label={t("wc.close")} onClick={() => win.hide().catch(() => {})} />
    </div>
  );
}
