import { useEffect, useState } from "react";

export default function useDarkMode() {
  const [dark, setDark] = useState(() =>
    document.body.classList.contains("dark-mode")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.body.classList.contains("dark-mode"));
    });
    observer.observe(document.body, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}
